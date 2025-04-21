import { DateTime } from 'luxon'
import { BaseModel, column, manyToMany } from '@adonisjs/lucid/orm'
import Meeting from './meetings.js'
import type { ManyToMany } from '@adonisjs/lucid/types/relations'

export default class Member extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare discordId: string

  @manyToMany(() => Meeting)
  declare meetings: ManyToMany<typeof Meeting>
}
