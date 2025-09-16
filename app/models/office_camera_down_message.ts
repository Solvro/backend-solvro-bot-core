import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class OfficeCameraDownMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare discordUserId: string

  @column()
  declare lastMessageSentAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}