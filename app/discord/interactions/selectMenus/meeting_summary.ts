import { StringSelectMenuInteraction } from 'discord.js'
import env from '#start/env'

function chunkString(str: string, maxLength: number = 2000): string[] {
    const chunks = []
    let current = 0
    while (current < str.length) {
        chunks.push(str.slice(current, current + maxLength))
        current += maxLength
    }
    return chunks
}


export default async function handleMeetingSummary(interaction: StringSelectMenuInteraction) {
    const meetingId = interaction.values[0]

    try {
        const response = await fetch(`${env.get('TRANSCRIBER_URL')}/summary/${meetingId}`)
        const data: any = await response.json()

        if (!data.summary) {
            throw new Error('No summary field in response')
        }

        const summaryChunks = chunkString(data.summary)

        await interaction.update({
            content: '**Summary for selected meeting:**',
            components: [],
        })

        for (const chunk of summaryChunks) {
            await interaction.followUp({ content: chunk, ephemeral: true })
        }

    } catch (err) {
        console.error(err)
        await interaction.update({
            content: '❌ Failed to fetch summary. It may still be generating. Try again later.',
            components: [],
        })
    }
}
