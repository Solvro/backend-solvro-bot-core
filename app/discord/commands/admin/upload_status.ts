import { SlashCommandBuilder, ChatInputCommandInteraction, MessageFlags, EmbedBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Meeting from '#models/meetings'
import GoogleDriveService from '#services/google_drive_service'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('upload_status')
    .setDescription('Check Google Drive upload status for meetings')
    .addIntegerOption((option) =>
      option
        .setName('meeting_id')
        .setDescription('Check status for a specific meeting ID')
        .setRequired(false)
    ),

  async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const meetingId = interaction.options.getInteger('meeting_id')

    if (meetingId) {
      // Show status for specific meeting
      const meeting = await Meeting.find(meetingId)
      
      if (!meeting) {
        await interaction.editReply({
          content: `❌ Meeting ${meetingId} not found.`
        })
        return
      }

      const googleDriveService = new GoogleDriveService()
      const isConfigured = await googleDriveService.isConfigured()

      if (!isConfigured) {
        await interaction.editReply({
          content: `❌ Google Drive is not configured.`
        })
        return
      }

      // Get uploaded files from Google Drive
      const uploadedFiles = await googleDriveService.getUploadedFiles(meeting)

      const embed = new EmbedBuilder()
        .setTitle(`📄 Google Drive Upload Status - Meeting ${meetingId}`)
        .setColor(meeting.filesUploadedToDrive ? 0x00ff00 : 0xffff00)
        .addFields([
          { name: 'Meeting Name', value: meeting.name || `Meeting ${meetingId}`, inline: true },
          { name: 'Status', value: meeting.filesUploadedToDrive ? '✅ Completed' : '⏳ Pending', inline: true },
          { name: 'Google Drive Folder', value: meeting.googleDriveFolderId ? `ID: ${meeting.googleDriveFolderId}` : 'Not created', inline: true },
        ])

      if (meeting.driveUploadCompletedAt) {
        embed.addFields([
          { name: 'Completed At', value: meeting.driveUploadCompletedAt.toLocaleString(), inline: true }
        ])
      }

      if (uploadedFiles.length > 0) {
        embed.addFields([
          { name: 'Uploaded Files', value: uploadedFiles.join('\n'), inline: false }
        ])
      } else {
        embed.addFields([
          { name: 'Uploaded Files', value: 'No files found in Google Drive', inline: false }
        ])
      }

      await interaction.editReply({ embeds: [embed] })
    } else {
      // Show status for recent meetings
      const recentMeetings = await Meeting.query()
        .where('recordingStatus', 'completed')
        .orderBy('finishedAt', 'desc')
        .limit(10)

      if (recentMeetings.length === 0) {
        await interaction.editReply({
          content: '✅ No completed meetings found.'
        })
        return
      }

      const embed = new EmbedBuilder()
        .setTitle('📄 Recent Meeting Upload Status')
        .setColor(0x0099ff)
        .setDescription(`Showing ${recentMeetings.length} recent completed meetings`)

      for (const meeting of recentMeetings.slice(0, 5)) {
        const status = meeting.filesUploadedToDrive ? '✅' : '⏳'
        const completedText = meeting.driveUploadCompletedAt ? 
          `\nCompleted: ${meeting.driveUploadCompletedAt.toLocaleString()}` : 
          '\nNot uploaded yet'
        
        embed.addFields([
          { 
            name: `${status} Meeting ${meeting.id}: ${meeting.name || 'Unnamed'}`, 
            value: `Finished: ${meeting.finishedAt?.toLocaleString() || 'Unknown'}${completedText}`, 
            inline: true 
          }
        ])
      }

      if (recentMeetings.length > 5) {
        embed.setFooter({ text: `... and ${recentMeetings.length - 5} more` })
      }

      await interaction.editReply({ embeds: [embed] })
    }
  }
)

export default command