import { StringSelectMenuInteraction, AttachmentBuilder, MessageFlags } from 'discord.js'
import env from '#start/env'

/**
 * Splits a string into chunks of `maxLength` without breaking words.
 */
function chunkStringRespectingLinesAndWords(text: string, maxLength = 2000): string[] {
    const chunks: string[] = []
    const lines = text.split('\n')
    let currentChunk = ''

    for (const line of lines) {
        if ((currentChunk + '\n' + line).length <= maxLength) {
            currentChunk += (currentChunk ? '\n' : '') + line
        } else {
            if (line.length > maxLength) {
                // The line itself is too long – split by words
                const words = line.split(' ')
                let lineChunk = ''
                for (const word of words) {
                    if ((lineChunk + ' ' + word).length <= maxLength) {
                        lineChunk += (lineChunk ? ' ' : '') + word
                    } else {
                        // Save current and start new
                        if (lineChunk) chunks.push(currentChunk + (currentChunk ? '\n' : '') + lineChunk)
                        else chunks.push(currentChunk)
                        currentChunk = ''
                        lineChunk = word
                    }
                }
                if (lineChunk) {
                    if ((currentChunk + '\n' + lineChunk).length <= maxLength) {
                        currentChunk += (currentChunk ? '\n' : '') + lineChunk
                    } else {
                        chunks.push(currentChunk)
                        currentChunk = lineChunk
                    }
                }
            } else {
                // Normal case: commit current chunk and start new
                if (currentChunk) chunks.push(currentChunk)
                currentChunk = line
            }
        }
    }

    if (currentChunk) chunks.push(currentChunk)

    return chunks
}

export default async function handleMeetingSummary(interaction: StringSelectMenuInteraction) {
    const meetingId = interaction.values[0]

    try {
        const response = await fetch(`${env.get('TRANSCRIBER_URL')}/summary/${meetingId}`)
        const data: any = await response.json()

        const summary = data.summary?.trim()

        if (!summary) {
            throw new Error('Missing summary in response')
        }

        // Use different strategies based on length
        if (summary.length <= 2000) {
            await interaction.update({
                content: `**Summary for selected meeting:**\n\n${summary}`,
                components: []
            })
        } else if (summary.length <= 6000) {
            const chunks = chunkStringRespectingLinesAndWords(summary)

            await interaction.update({
                content: '**Summary for selected meeting (split):**',
                components: [],
            })

            for (const chunk of chunks) {
                await interaction.followUp({
                    content: chunk,
                    flags: MessageFlags.Ephemeral,
                })
            }
        } else {
            // Too long — send as file
            const file = new AttachmentBuilder(Buffer.from(summary), {
                name: `meeting-summary-${meetingId}.md`,
            })

            await interaction.update({
                content: '**Summary is too long to display here. Download the full summary below:**',
                files: [file],
                components: []
            })
        }
    } catch (err) {
        console.error(err)
        await interaction.update({
            content: '❌ Failed to fetch summary. It may still be generating. Try again later.',
            components: []
        })
    }
}
