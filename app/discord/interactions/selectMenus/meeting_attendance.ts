import { StringSelectMenuInteraction, MessageFlags } from 'discord.js'
import Meeting, { AttendanceStatus } from '#models/meetings';


export default async function handleMeetingAttendance(interaction: StringSelectMenuInteraction) {
    const meetingId = interaction.values[0]

    const meeting = await Meeting.query()
        .where('id', meetingId)
        .where('attendance_status', AttendanceStatus.FINISHED_MONITORING)
        .preload('members')
        .first()

    if (!meeting) {
        interaction.update({
            content: 'There is no meeting with given ID and a completed attendance list',
            components: []
        })
        return
    }

    const uniqueDiscordIds = [...new Set(meeting.members.map((m) => m.discordId))]

    if (uniqueDiscordIds.length === 0) {
        interaction.update({
            content: 'No members attended the meeting.',
            components: []
        })
        return
    }

    const memberList = uniqueDiscordIds.map((id) => `• <@${id}>`).join('\n')

    interaction.update({
        content: `**Attending Members for meeting "${meeting.name ?? 'Unnamed Meeting'}" (${uniqueDiscordIds.length}):**\n${memberList}`,
        components: []
    })
}