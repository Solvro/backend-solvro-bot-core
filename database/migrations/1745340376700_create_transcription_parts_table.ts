import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transcription_parts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.text('discord_user_id').notNullable()
      table.timestamp('recorded_at').notNullable()
      table.float('duration').notNullable()
      table.integer('meeting_id').references('id').inTable('meetings').notNullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
