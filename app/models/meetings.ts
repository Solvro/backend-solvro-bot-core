import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import Member from './member.js'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import MeetingChunk from './meeting_chunk.js'

export enum RecordingStatus {
  PENDING = 'pending',
  RECORDING = 'recording',
  STOPPING = 'stopping',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export default class Meeting extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare name: string | null

  @column()
  declare discordChannelId: string | null

  @column()
  declare isMonitored: boolean

  @column()
  declare transcription: string | null

  @column()
  declare recordingStatus: RecordingStatus | null

  @column.dateTime()
  declare finishedAt: DateTime | null

  @manyToMany(() => Member)
  declare members: ManyToMany<typeof Member>

  @hasMany(() => MeetingChunk)
  declare chunks: HasMany<typeof MeetingChunk>
}
