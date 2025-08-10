import { CommandInteraction, SlashCommandBuilder, MessageFlags } from 'discord.js'
import { StaticCommand } from '../commands.js'
import { CalendarEvent } from '#services/google_calendar_service'
import logger from '@adonisjs/core/services/logger'
import env from '#start/env'

const command: StaticCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('calendar-add-event')
    .setDescription('Add a new event to Google Calendar')
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
      option.setName('description').setDescription('Event description').setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('location').setDescription('Event location').setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('attendees')
        .setDescription('Attendees (comma-separated index numbers or emails)')
        .setRequired(false)
    ),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    try {
      const title = interaction.options.get('title')?.value as string
      const date = interaction.options.get('date')?.value as string
      const startTime = interaction.options.get('start-time')?.value as string
      const endTime = interaction.options.get('end-time')?.value as string
      const description = (interaction.options.get('description')?.value as string) || ''
      const location = (interaction.options.get('location')?.value as string) || ''
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
            .map((attendee) => ({
              email: attendee.includes('@') ? attendee : `${attendee}@student.pwr.edu.pl`,
            }))
        : []

      const { default: googleCalendarService } = await import('#services/google_calendar_service')

      const event: CalendarEvent = {
        summary: title,
        description,
        location,
        start: {
          dateTime: googleCalendarService.formatToRFC3339WithWarsawTime(date, startTime),
          timeZone: 'Europe/Warsaw',
        },
        end: {
          dateTime: googleCalendarService.formatToRFC3339WithWarsawTime(date, endTime),
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

      await interaction.editReply({
        content: `✅ **Event created successfully!**\n\n📅 **${title}**\n🕒 ${date} ${startTime} - ${endTime}\n📝 ${description}\n📍 ${location}${attendeesText}\n\n🔗 [View in Calendar](${createdEvent.htmlLink})`,
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
