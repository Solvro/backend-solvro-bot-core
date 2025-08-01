import { SlashCommandBuilder, CommandInteraction, AttachmentBuilder, MessageFlags, Message } from 'discord.js'
import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Meeting, { RecordingStatus } from '#models/meetings'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('transcription')
    .setDescription('Download transcription for a completed meeting')
    .addIntegerOption((option) =>
      option.setName('meeting').setDescription('ID of the completed meeting').setRequired(true)
    ),

  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const meetingId = interaction.options.get('meeting')?.value as number

    const meeting = await Meeting.find(meetingId)

    if (!meeting || meeting.recordingStatus !== RecordingStatus.COMPLETED) {
      await interaction.editReply({
        content: 'Meeting not found or not completed.',
      })
      return
    }

    const chunks = await meeting.related('chunks').query().orderBy('startTime')

    if (chunks.length === 0) {
      await interaction.editReply({
        content: 'No transcription chunks found for this meeting.',
      })
      return
    }

    const userNames: Record<string, string> = {}
    for (const chunk of chunks)
      if (!userNames[chunk.discordUserId]) {
        const user = interaction.client.users.cache.get(chunk.discordUserId)
        userNames[chunk.discordUserId] = user ? user.username : `User#${chunk.discordUserId}`
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

    await interaction.editReply({
      content: `Transcription for meeting "${meeting.name ?? '#' + meeting.id}"`,
      files: [attachment],
    })
  }
)

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default command
