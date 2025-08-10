import { google } from 'googleapis'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export interface CalendarEvent {
  summary: string
  description?: string
  location?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  attendees?: Array<{ email: string }>
}

// TODO: jak bedzie baza czlonkow - updatowac dostepy do googla przy dodawaniu/usuwaniu osob

export class GoogleCalendarService {
  private calendar
  private auth

  constructor() {
    this.auth = new google.auth.OAuth2(
      env.get('GOOGLE_CLIENT_ID'),
      env.get('GOOGLE_CLIENT_SECRET'),
      env.get('GOOGLE_REDIRECT_URI')
    )

    const refreshToken = env.get('GOOGLE_REFRESH_TOKEN')
    if (refreshToken) {
      this.auth.setCredentials({
        refresh_token: refreshToken,
      })
    }

    this.calendar = google.calendar({ version: 'v3', auth: this.auth })
  }

  async createEvent(event: CalendarEvent, calendarId: string = 'primary'): Promise<any> {
    try {
      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event,
      })

      return response.data
    } catch (error) {
      logger.error('Error creating calendar event:', error)
      throw new Error(`Failed to create calendar event: ${error.message}`)
    }
  }

  async getUpcomingEvent(calendarId: string = 'primary'): Promise<any | null> {
    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: new Date().toISOString(),
        maxResults: 1,
        singleEvents: true,
        orderBy: 'startTime',
      })

      const events = response.data.items || []
      return events.length > 0 ? events[0] : null
    } catch (error) {
      logger.error('Error getting upcoming event:', error)
      throw new Error(`Failed to get upcoming event: ${error.message}`)
    }
  }

  formatToRFC3339WithWarsawTime(date: string, time: string): string {
    const [day, month, year] = date.split('.')
    const isWinterTime = this.isWinterTime(new Date(`${year}-${month}-${day}`))
    const offset = isWinterTime ? '+01:00' : '+02:00'

    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00${offset}`
  }

  private isWinterTime(date: Date): boolean {
    const month = date.getMonth() + 1
    return month < 3 || month > 10
  }
}

export default new GoogleCalendarService()
