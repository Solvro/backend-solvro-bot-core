import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Meeting, { AttendanceStatus } from '#models/meetings'
import { ActionRowBuilder, CommandInteraction, MessageFlags, SlashCommandBuilder, StringSelectMenuBuilder } from 'discord.js'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('show_attendance')
    .setDescription('Show attendance list of selected meeting'),
  async (interaction: CommandInteraction) => {
    const monitoredMeetings = await Meeting.query().where('attendance_status', AttendanceStatus.FINISHED_MONITORING);

    if (monitoredMeetings.length === 0) {
      interaction.reply({
        content: 'No meetins with attendance monitoring found',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('select_meeting_attendance')
      .setPlaceholder('Select a meeting')
      .addOptions(
        monitoredMeetings.map((meeting) => ({
          label: meeting.name ?? `#${meeting.id}`,
          value: meeting.id.toString(),
        }))
      );

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu)

    await interaction.reply({
      content: 'Please select a meeting to view its attendance list:',
      components: [row],
      flags: MessageFlags.Ephemeral,
    })

    // const meeting = await Meeting.query()
    //   .where('recording_status', RecordingStatus.COMPLETED)
    //   .where('attendance_status', AttendanceStatus.FINISHED_MONITORING)
    //   .orderBy('id', 'desc')
    //   .preload('members')
    //   .first()

    // if (!meeting) {
    //   interaction.reply({
    //     content: 'There are no completed meetings',
    //     flags: MessageFlags.Ephemeral,
    //   })
    //   return
    // }

    // const uniqueDiscordIds = [...new Set(meeting.members.map((m) => m.discordId))]

    // if (uniqueDiscordIds.length === 0) {
    //   interaction.reply({
    //     content: 'No members attended the last meeting.',
    //     flags: MessageFlags.Ephemeral,
    //   })
    //   return
    // }

    // const memberList = uniqueDiscordIds.map((id) => `• <@${id}>`).join('\n')

    // interaction.reply({
    //   content: `**Attending Members for meeting "${meeting.name ?? 'Unnamed Meeting'}" (${uniqueDiscordIds.length}):**\n${memberList}`,
    //   flags: MessageFlags.Ephemeral,
    // })
  }
)

export default command
