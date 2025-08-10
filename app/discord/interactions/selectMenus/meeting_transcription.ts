import { StringSelectMenuInteraction, AttachmentBuilder } from 'discord.js'
import Meeting, { RecordingStatus } from '#models/meetings';
import { client } from '#app/discord/index';
import env from '#start/env';

function formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default async function handleMeetingTranscription(interaction: StringSelectMenuInteraction) {
    const meetingId = interaction.values[0];

    const meeting = await Meeting.find(meetingId)

    if (!meeting || meeting.recordingStatus !== RecordingStatus.COMPLETED) {
        await interaction.update({
            content: 'Meeting not found or not completed.',
            components: []
        })
        return
    }

    const chunks = await meeting.related('chunks').query().orderBy('startTime')

    if (chunks.length === 0) {
        await interaction.update({
            content: 'No transcription chunks found for this meeting.',
            components: []

        })
        return
    }

    const guild = interaction.guild ?? await client.guilds.fetch(env.get('DISCORD_GUILD_ID'))
    // Cache all users
    await guild.members.fetch();

    const userNames: Record<string, string> = {}
    for (const chunk of chunks)
        if (!userNames[chunk.discordUserId]) {
            const member = guild.members.cache.get(chunk.discordUserId)
            userNames[chunk.discordUserId] = member ? member.displayName : `User#${chunk.discordUserId}`
        }

    const formattedText = chunks
        .map((chunk) => {
            const timestamp = formatTimestamp(chunk.startTime)
            const userName = userNames[chunk.discordUserId]
            return `[${timestamp}] ${userName}: ${chunk.text}`
        })
        .join('\n')

    const buffer = Buffer.from(formattedText, 'utf-8')
    const attachment = new AttachmentBuilder(buffer, {
        name: `transcription_meeting_${meetingId}.txt`,
    })

    await interaction.update({
        content: `Transcription for meeting "${meeting.name ?? '#' + meeting.id}"`,
        files: [attachment],
        components: []

    })
}