import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class OfficeStatusMessage extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare channelId: string

  @column()
  declare messageId: string

  @column()
  declare count: number | null

  @column()
  declare lastPresence: DateTime | null

  @column()
  declare imagePath: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}