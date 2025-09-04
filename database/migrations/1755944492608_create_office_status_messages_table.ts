import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'office_status_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.text('channel_id').notNullable();
      table.text('message_id').notNullable();

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}