import { CommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js'
import { StaticCommand } from '../commands.js'
import env from '#start/env'

const command: StaticCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('calendar_link')
    .setDescription('Get the link to KN Solvro Google Calendar'),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const calendarId = env.get('GOOGLE_CALENDAR_ID')

    if (!calendarId) {
      await interaction.editReply({
        content: '❌ Calendar ID is not configured.',
      })
      return
    }

    const calendarUrl = `https://calendar.google.com/calendar/embed?src=${encodeURIComponent(calendarId)}`

    await interaction.editReply({
      content: `📅 **KN Solvro Calendar**\n\n🔗 [Open Calendar](${calendarUrl})`,
    })
  }
)

export default command
