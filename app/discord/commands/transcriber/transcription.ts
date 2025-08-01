import { SlashCommandBuilder, CommandInteraction, MessageFlags, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Meeting, { RecordingStatus } from '#models/meetings'


const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('transcription')
    .setDescription('Download transcription for a completed meeting'),

  async (interaction: CommandInteraction) => {
    const completedMeetings = await Meeting.query().where('recordingStatus', RecordingStatus.COMPLETED)

    if (completedMeetings.length === 0) {
      interaction.reply({
        content: 'No completed meetings found.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_meeting_transcription')
      .setPlaceholder('Select a completed meeting')
      .addOptions(
        completedMeetings.map((meeting) => ({
          label: meeting.name ?? `#${meeting.id}`,
          value: meeting.id.toString(),
        }))
      );


    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

    await interaction.reply({
      content: 'Please select a meeting to view its AI-generated transcription:',
      components: [row],
      flags: MessageFlags.Ephemeral,
    })

    // await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    // const meetingId = interaction.options.get('meeting')?.value as number

    // const meeting = await Meeting.find(meetingId)

    // if (!meeting || meeting.recordingStatus !== RecordingStatus.COMPLETED) {
    //   await interaction.editReply({
    //     content: 'Meeting not found or not completed.',
    //   })
    //   return
    // }

    // const chunks = await meeting.related('chunks').query().orderBy('startTime')

    // if (chunks.length === 0) {
    //   await interaction.editReply({
    //     content: 'No transcription chunks found for this meeting.',
    //   })
    //   return
    // }

    // const userNames: Record<string, string> = {}
    // for (const chunk of chunks)
    //   if (!userNames[chunk.discordUserId]) {
    //     const user = interaction.client.users.cache.get(chunk.discordUserId)
    //     userNames[chunk.discordUserId] = user ? user.username : `User#${chunk.discordUserId}`
    //   }

    // const formattedText = chunks
    //   .map((chunk) => {
    //     const timestamp = formatTimestamp(chunk.startTime)
    //     const userName = userNames[chunk.discordUserId]
    //     return `[${timestamp}] ${userName}: ${chunk.text}`
    //   })
    //   .join('\n')

    // const buffer = Buffer.from(formattedText, 'utf-8')
    // const attachment = new AttachmentBuilder(buffer, {
    //   name: `transcription_meeting_${meetingId}.txt`,
    // })

    // await interaction.editReply({
    //   content: `Transcription for meeting "${meeting.name ?? '#' + meeting.id}"`,
    //   files: [attachment],
    // })
  }
)

export default command
