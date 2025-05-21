import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class TranscriptionPart extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare discordUserId: string

  @column()
  declare startTime: number

  @column()
  declare meetingId: number

  @column()
  declare text: string

  @column()
  declare duration: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
