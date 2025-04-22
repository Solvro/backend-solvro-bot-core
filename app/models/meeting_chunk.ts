import { DateTime, Duration } from 'luxon'
import { BaseModel, column, hasOne } from '@adonisjs/lucid/orm'
import Meeting from './meetings.js'
import type { HasOne } from '@adonisjs/lucid/types/relations'

export default class MeetingChunk extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare discordUserId: string

  @column.dateTime()
  declare recordedAt: DateTime

  @column.dateTime()
  declare recordingTimestamp: DateTime

  @column()
  declare duration: Duration
}
