import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, manyToMany } from '@adonisjs/lucid/orm'
import Meeting from './meetings.js'
import type { HasMany, ManyToMany } from '@adonisjs/lucid/types/relations'
import DiscordActivity from './discord_activity.js'

export enum MemberStatus {
  NEW = 'new',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export default class Member extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare firstName: string | null

  @column()
  declare lastName: string | null

  @column()
  declare email: string | null

  @column()
  declare phone: string | null

  @column()
  declare indexNumber: string | null

  @column()
  declare joinDate: Date

  @column()
  declare faculty: string | null

  @column()
  declare fieldOfStudy: string | null

  @column()
  declare studyYear: string | null

  @column()
  declare messengerUrl: string | null

  @column()
  declare currentSection: string | null

  @column()
  declare currentRole: string | null

  @column()
  declare currentProjects: string | null

  @column()
  declare otherProjects: string | null

  @column()
  declare otherExperiences: string | null

  @column()
  declare status: MemberStatus

  @column()
  declare discordId: string

  @column()
  declare githubUsername: string | null

  @column()
  declare githubUrl: string | null

  @column()
  declare githubId: string | null

  @manyToMany(() => Meeting)
  declare meetings: ManyToMany<typeof Meeting>

  @hasMany(() => DiscordActivity, { localKey: 'discordId', foreignKey: 'discordId' })
  declare discordActivity: HasMany<typeof DiscordActivity>

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime
}
