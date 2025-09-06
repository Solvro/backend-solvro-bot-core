import { CommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js'
import { StaticCommand } from '../commands.js'
import env from '#start/env'

const command: StaticCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('calendar-upcoming-event')
    .setDescription('Show the next upcoming event from Google Calendar'),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    try {
      const { default: googleCalendarService } = await import('#services/google_calendar_service')

      const event = await googleCalendarService.getUpcomingEvent(env.get('GOOGLE_CALENDAR_ID'))

      if (!event) {
        await interaction.editReply({
          content: '📅 No upcoming events found in your calendar.',
        })
        return
      }

      const start = event.start?.dateTime || event.start?.date
      const startDate = new Date(start!).toLocaleString()
      const title = event.summary || 'No title'
      const description = event.description || 'No description'
      const location = event.location ? `\n📍 **Location:** ${event.location}` : ''
      const attendees =
        event.attendees && event.attendees.length > 0
          ? `\n👥 **Attendees:** ${event.attendees.map((a: any) => a.email).join(', ')}`
          : ''

      await interaction.editReply({
        content: `📅 **Next Upcoming Event:**\n\n**${title}**\n📅 ${startDate}\n📝 ${description}${location}${attendees}\n\n🔗 [Open in Calendar](${event.htmlLink})`,
      })
    } catch (error: any) {
      console.error('Error listing calendar events:', error)

      if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
        await interaction.editReply({
          content:
            '❌ Google Calendar authentication failed. Please contact an administrator to re-authorize the bot.',
        })
      } else {
        await interaction.editReply({
          content: `❌ Failed to list calendar events: ${error.message}`,
        })
      }
    }
  }
)

export default command
