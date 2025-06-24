import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class GithubActivity extends BaseModel {
    @column({ isPrimary: true })
    declare id: number

    @column()
    declare githubId: string | null

    @column()
    declare type: 'commit' | 'pr' | 'issue' | 'review' | 'other'

    @column()
    declare message: string | null

    @column()
    declare authorGithubId: string

    @column()
    declare repo: string

    @column()
    declare date: DateTime

    @column.dateTime({ autoCreate: true })
    declare createdAt: DateTime

    @column.dateTime({ autoCreate: true, autoUpdate: true })
    declare updatedAt: DateTime
}