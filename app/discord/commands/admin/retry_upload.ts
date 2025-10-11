import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags } from 'discord.js'
import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Meeting from '#models/meetings'
import GoogleDriveService from '#services/google_drive_service'
import env from '#start/env'

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('retry_upload')
        .setDescription('Manually retry Google Drive upload for a meeting')
        .addIntegerOption((option) =>
            option
                .setName('meeting_id')
                .setDescription('Meeting ID to retry upload for')
                .setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName('force')
                .setDescription('Force upload even if files have already been uploaded')
                .setRequired(false)
        ),

    async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const meetingId = interaction.options.getInteger('meeting_id', true)
        const force = interaction.options.getBoolean('force') ?? false

        try {
            const meeting = await Meeting.find(meetingId)

            if (!meeting) {
                await interaction.editReply({
                    content: `❌ Meeting ${meetingId} not found.`
                })
                return
            }

            if (meeting.filesUploadedToDrive && !force) {
                await interaction.editReply({
                    content: `❌ Meeting ${meetingId} files have already been uploaded to Google Drive. Use --force to override.`
                })
                return
            }

            const googleDriveService = new GoogleDriveService()

            if (!(await googleDriveService.isConfigured())) {
                await interaction.editReply({
                    content: `❌ Google Drive is not configured.`
                })
                return
            }

            const response = await fetch(`${env.get('TRANSCRIBER_URL')}/summary/${meetingId}`)

            if (!response.ok) {
                await interaction.editReply({
                    content: `❌ Cannot retry upload for meeting ${meetingId}: Summary is not ready yet or transcriber service is unavailable.`
                })
                return
            }

            const data: any = await response.json()
            const summary = data.summary?.trim()

            if (!summary) {
                await interaction.editReply({
                    content: `❌ Cannot retry upload for meeting ${meetingId}: Empty summary received.`
                })
                return
            }

            // Attempt upload
            await googleDriveService.uploadAllMeetingFiles(meeting, summary)

            await interaction.editReply({
                content: `✅ Successfully uploaded files for meeting ${meetingId} to Google Drive.`
            })
        } catch (error) {
            await interaction.editReply({
                content: `❌ Failed to retry upload for meeting ${meetingId}: ${error instanceof Error ? error.message : 'Unknown error'}`
            })
        }
    }
)

export default command