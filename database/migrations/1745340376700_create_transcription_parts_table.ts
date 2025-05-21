import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'transcription_parts'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('discord_user_id').nullable()
      table.integer('start_time').notNullable()
      table.float('duration').notNullable()
      table.integer('meeting_id').references('id').inTable('meetings').notNullable()
      table.text('text')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
