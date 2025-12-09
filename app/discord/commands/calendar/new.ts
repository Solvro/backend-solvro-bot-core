import { SlashCommandBuilder, MessageFlags, ChatInputCommandInteraction } from 'discord.js'
import { StaticCommand } from '../commands.js'
import { CalendarEvent } from '#services/google_calendar_service'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

const command: StaticCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('calendar_new')
    .setDescription('Creates an event in KN Solvro Google Calendar')
    .addStringOption((option) =>
      option.setName('title').setDescription('Event title').setRequired(true)
    )
    .addStringOption((option) =>
      option.setName('date').setDescription('Event date (DD.MM.YYYY)').setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('start-time')
        .setDescription('Start time (HH:MM, 24-hour format)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('end-time')
        .setDescription('End time (HH:MM, 24-hour format)')
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName('location')
        .setDescription('Event location')
        .setRequired(true)
        .addChoices(
          { name: 'Discord', value: 'discord' },
          { name: 'Office', value: 'office' },
          { name: 'Conference room', value: 'conference_room' },
          { name: 'Other', value: 'other' }
        )
    )
    .addStringOption((option) =>
      option.setName('description').setDescription('Event description').setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('attendees')
        .setDescription('Attendees (comma-separated index numbers or emails)')
        .setRequired(false)
    ),
  async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const INDEX_LENGTH = 6

    try {
      const title = interaction.options.get('title')?.value as string
      const date = interaction.options.get('date')?.value as string
      const startTime = interaction.options.get('start-time')?.value as string
      const endTime = interaction.options.get('end-time')?.value as string
      const description = (interaction.options.get('description')?.value as string) || ''
      const location = interaction.options.get('location')?.value as string
      const attendeesInput = (interaction.options.get('attendees')?.value as string) || ''

      const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/
      if (!dateRegex.test(date)) {
        await interaction.editReply({
          content: '❌ Invalid date format. Please use DD.MM.YYYY (e.g., 15.01.2025)',
        })
        return
      }

      const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        await interaction.editReply({
          content: '❌ Invalid time format. Please use HH:MM in 24-hour format (e.g., 14:30)',
        })
        return
      }

      const attendees: Array<{ email: string }> = attendeesInput
        ? attendeesInput
            .split(',')
            .map((attendee) => attendee.trim())
            .filter((attendee) => attendee.length === INDEX_LENGTH || attendee.includes('@'))
            .map((attendee) => ({
              email: attendee.includes('@') ? attendee : `${attendee}@student.pwr.edu.pl`,
            }))
        : []

      let locationText: string
      switch (location) {
        case 'discord':
          locationText = 'Discord'
          break
        case 'office':
          locationText = 'Biuro'
          break
        case 'conference_room':
          locationText = 'Sala konferencyjna'
          break
        case 'other':
          locationText = ''
          break
        default:
          locationText = ''
      }

      const { default: googleCalendarService } = await import('#services/google_calendar_service')

      const [startHour, startMinute] = startTime.split(':').map(Number)
      const [endHour, endMinute] = endTime.split(':').map(Number)
      const startMinutes = startHour * 60 + startMinute
      const endMinutes = endHour * 60 + endMinute

      let endDate = date
      if (endMinutes < startMinutes) {
        const [day, month, year] = date.split('.').map(Number)
        const dateObj = new Date(year, month - 1, day)
        dateObj.setDate(dateObj.getDate() + 1)

        const nextDay = dateObj.getDate().toString().padStart(2, '0')
        const nextMonth = (dateObj.getMonth() + 1).toString().padStart(2, '0')
        const nextYear = dateObj.getFullYear()

        endDate = `${nextDay}.${nextMonth}.${nextYear}`
      }

      if (location === 'office' || location === 'conference_room') {
        const eventStartDateTime = googleCalendarService.formatToRFC3339WithWarsawTime(
          date,
          startTime
        )
        const eventEndDateTime = googleCalendarService.formatToRFC3339WithWarsawTime(
          endDate,
          endTime
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

        const locationKeyword = location === 'office' ? 'biuro' : 'konferencyjna'
        const sameLocationEvents = existingEvents.filter((event) =>
          event.location?.toLowerCase().includes(locationKeyword)
        )

        const hasConflict = sameLocationEvents.some((event) => {
          const existingStart = new Date(event.start?.dateTime || event.start?.date)
          const existingEnd = new Date(event.end?.dateTime || event.end?.date)

          return eventStartDate < existingEnd && eventEndDate > existingStart
        })

        if (hasConflict) {
          const locationName = location === 'office' ? 'Office' : 'Conference room'
          await interaction.editReply({
            content: `❌ **${locationName} is already booked during this time!**\n\nPlease choose a different time slot or check availability with \`/office_availability\` or \`/conference_room_availability\`.`,
          })
          return
        }
      }

      const event: CalendarEvent = {
        summary: title,
        description,
        location: locationText,
        start: {
          dateTime: googleCalendarService.formatToRFC3339WithWarsawTime(date, startTime),
          timeZone: 'Europe/Warsaw',
        },
        end: {
          dateTime: googleCalendarService.formatToRFC3339WithWarsawTime(endDate, endTime),
          timeZone: 'Europe/Warsaw',
        },
        attendees,
      }

      const createdEvent = await googleCalendarService.createEvent(
        event,
        env.get('GOOGLE_CALENDAR_ID')
      )

      const attendeesText =
        attendees.length > 0 ? `\n👥 ${attendees.map((a) => a.email).join(', ')}` : ''

      const endDateDisplay = endDate !== date ? ` (next day)` : ''

      await interaction.editReply({
        content: `✅ **Event created successfully!**\n\n📅 **${title}**\n🕒 ${date} ${startTime} - ${endTime}${endDateDisplay}\n📝 ${description}\n📍 ${locationText}${attendeesText}\n\n🔗 [View in Calendar](${createdEvent.htmlLink})`,
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
