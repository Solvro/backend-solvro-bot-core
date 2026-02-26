import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js'
import { StaticCommand } from '../../commands.js'
import { CalendarEvent } from '#services/google_calendar_service'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

const command: StaticCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('printer_reserve')
    .setDescription(
      'Reserves printer in the office for a specified time slot and creates a calendar event'
    )
    .addStringOption((option) =>
      option
        .setName('who')
        .setDescription('Who will use the printer? (email or index number)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('start-date')
        .setDescription('Start Date (DD.MM.YYYY HH:MM, 24-hour format)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('end-date')
        .setDescription('End Date (DD.MM.YYYY HH:MM, 24-hour format)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('object').setDescription('Object to print').setRequired(false)
    ),
  async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const INDEX_LENGTH = 6

    try {
      const whoInput = interaction.options.get('who')?.value as string
      const object = (interaction.options.get('object')?.value as string) || '_'
      const startDateInput = interaction.options.get('start-date')?.value as string
      const endDateInput = interaction.options.get('end-date')?.value as string

      const index = whoInput.includes('@') ? whoInput.split('@')[0] : whoInput
      if (index.length !== INDEX_LENGTH || Number.isNaN(Number(index))) {
        await interaction.editReply({
          content: '❌ Invalid input for "who". Please provide a valid index number or email.',
        })
        return
      }

      const dateTimeRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/
      if (!dateTimeRegex.test(startDateInput) || !dateTimeRegex.test(endDateInput)) {
        await interaction.editReply({
          content:
            '❌ Invalid date format. Please use DD.MM.YYYY HH:MM in 24-hour format (e.g., 25.12.2024 14:30)',
        })
        return
      }

      const { default: googleCalendarService } = await import('#services/google_calendar_service')

      const eventStartDateTime = googleCalendarService.formatToRFC3339WithWarsawTime(
        startDateInput.split(' ')[0],
        startDateInput.split(' ')[1]
      )

      const eventEndDateTime = googleCalendarService.formatToRFC3339WithWarsawTime(
        endDateInput.split(' ')[0],
        endDateInput.split(' ')[1]
      )

      const eventStartDate = new Date(eventStartDateTime)
      const eventEndDate = new Date(eventEndDateTime)

      const rangeStart = new Date(eventStartDate)
      rangeStart.setDate(rangeStart.getDate() - 1)
      rangeStart.setHours(0, 0, 0, 0)

      const rangeEnd = new Date(eventEndDate)
      rangeEnd.setDate(rangeEnd.getDate() + 1)
      rangeEnd.setHours(23, 59, 59, 999)

      const existingEvents = await googleCalendarService.getEventsInRange(
        env.get('GOOGLE_CALENDAR_ID'),
        rangeStart,
        rangeEnd
      )

      const locationKeyword = 'drukarka'
      const sameLocationEvents = existingEvents.filter((event) =>
        event.location?.toLowerCase().includes(locationKeyword)
      )

      const hasConflict = sameLocationEvents.some((event) => {
        const existingStart = new Date(event.start?.dateTime || event.start?.date)
        const existingEnd = new Date(event.end?.dateTime || event.end?.date)

        return eventStartDate < existingEnd && eventEndDate > existingStart
      })

      if (hasConflict) {
        await interaction.editReply({
          content: `❌ **Priner is being used during this time!**\n\nPlease choose a different time slot or check availability with \`/printer_availability\`.`,
        })
        return
      }

      const summary = `Rezerwacja drukarki - ${object}`
      const description = `Zajęta przez ${whoInput}`
      const location = 'Drukarka'

      const event: CalendarEvent = {
        summary,
        description,
        location,
        start: {
          dateTime: eventStartDateTime,
          timeZone: 'Europe/Warsaw',
        },
        end: {
          dateTime: eventEndDateTime,
          timeZone: 'Europe/Warsaw',
        },
        attendees: [{ email: `${index}@student.pwr.edu.pl` }],
      }

      const createdEvent = await googleCalendarService.createEvent(
        event,
        env.get('GOOGLE_CALENDAR_ID')
      )

      await interaction.editReply({
        content: `✅ **Event created successfully!**\n\n📅 **${summary}**\n🕒 ${startDateInput} - ${endDateInput}\n📝 ${description}\n\n🔗 [View in Calendar](${createdEvent.htmlLink})`,
      })
    } catch (error: any) {
      logger.error('Error creating calendar event:', error)

      if (error.message?.includes('invalid_grant') || error.message?.includes('unauthorized')) {
        await interaction.editReply({
          content: '❌ Google Calendar authentication failed. Please re-authorize the bot.',
        })
      } else {
        await interaction.editReply({
          content: `❌ Failed to create calendar event: ${error.message}`,
        })
      }
    }
  }
)

export default command
