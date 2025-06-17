import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'discord_activities'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.date('date').notNullable()
      table.text('discord_id').notNullable()
      table.integer('message_count')

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
