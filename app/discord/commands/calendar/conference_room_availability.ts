import {
  SlashCommandBuilder,
  MessageFlags,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from 'discord.js'
import { StaticCommand } from '../commands.js'
import env from '#start/env'

const command: StaticCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('conference_room_availability')
    .setDescription('Show conference room availability calendar for a selected week')
    .addIntegerOption((option) =>
      option
        .setName('week')
        .setDescription('Which week to display (0 = this week, 1 = next week, etc.)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(52)
    )
    .addIntegerOption((option) =>
      option
        .setName('start-hour')
        .setDescription('Start hour (0-23, default: 0)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(23)
    )
    .addIntegerOption((option) =>
      option
        .setName('end-hour')
        .setDescription('End hour (1-24, default: 24)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(24)
    )
    .addIntegerOption((option) =>
      option
        .setName('interval')
        .setDescription('Time slot interval in minutes (default: 15)')
        .setRequired(false)
        .addChoices(
          { name: '15 minutes', value: 15 },
          { name: '30 minutes', value: 30 },
          { name: '60 minutes', value: 60 }
        )
    ),
  async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    try {
      const { default: googleCalendarService } = await import('#services/google_calendar_service')

      const weekOffset = (interaction.options.get('week')?.value as number) || 0
      const startHour = (interaction.options.get('start-hour')?.value as number) ?? 0
      const endHour = (interaction.options.get('end-hour')?.value as number) ?? 24
      const interval = (interaction.options.get('interval')?.value as number) ?? 15

      if (startHour >= endHour) {
        await interaction.editReply({
          content: '❌ Start hour must be less than end hour.',
        })
        return
      }

      const today = new Date()
      const currentDay = today.getDay()
      const daysUntilMonday = currentDay === 0 ? -6 : 1 - currentDay

      const startDate = new Date(today)
      startDate.setDate(today.getDate() + daysUntilMonday + weekOffset * 7)
      startDate.setHours(0, 0, 0, 0)

      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 6)
      endDate.setHours(23, 59, 59, 999)

      const events = await googleCalendarService.getEventsInRange(
        env.get('GOOGLE_CALENDAR_ID'),
        startDate,
        endDate
      )

      const conferenceRoomEvents = events.filter(
        (event) =>
          event.location?.toLowerCase().includes('konferencyjna') ||
          event.location?.toLowerCase().includes('conference')
      )

      const imageBuffer = googleCalendarService.generateCalendarImage(
        startDate,
        conferenceRoomEvents,
        {
          workStartHour: startHour,
          workEndHour: endHour,
          intervalMinutes: interval,
        }
      )

      const weekLabel =
        weekOffset === 0 ? 'This Week' : weekOffset === 1 ? 'Next Week' : `Week +${weekOffset}`

      const attachment = new AttachmentBuilder(imageBuffer, {
        name: 'conference-room-availability.png',
      })

      await interaction.editReply({
        content: `📅 **Conference Room Availability - ${weekLabel}**\n⏰ Hours: ${startHour}:00 - ${endHour}:00 (${interval}min intervals)`,
        files: [attachment],
      })
    } catch (error: any) {
      console.error('Error checking conference room availability:', error)

      if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
        await interaction.editReply({
          content:
            '❌ Google Calendar authentication failed. Please contact an administrator to re-authorize the bot.',
        })
      } else {
        await interaction.editReply({
          content: `❌ Failed to check conference room availability: ${error.message}`,
        })
      }
    }
  }
)

export default command
