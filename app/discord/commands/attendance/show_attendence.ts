import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Meeting, { RecordingStatus } from '#models/meetings'
import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('show_attendence')
    .setDescription('Show attendence list of last meeting'),
  async (interaction: CommandInteraction) => {
    const meeting = await Meeting.query()
      .where('recording_status', RecordingStatus.COMPLETED)
      .where('is_monitored', true)
      .orderBy('id', 'desc')
      .preload('members')
      .first()

    if (!meeting) {
      interaction.reply({
        content: 'There are no completed meetings',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    const uniqueDiscordIds = [...new Set(meeting.members.map((m) => m.discordId))]

    if (uniqueDiscordIds.length === 0) {
      interaction.reply({
        content: 'No members attended the last meeting.',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    const memberList = uniqueDiscordIds.map((id) => `• <@${id}>`).join('\n')

    interaction.reply({
      content: `**Attending Members for meeting "${meeting.name ?? 'Unnamed Meeting'}":**\n${memberList}`,
      flags: MessageFlags.Ephemeral,
    })
  }
)

export default command
