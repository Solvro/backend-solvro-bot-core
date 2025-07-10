import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class DiscordActivity extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare discordId: string

  @column()
  declare date: Date

  @column()
  declare messageCount: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}