import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'office_camera_down_messages'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.string('discord_user_id').notNullable()
      table.timestamp('last_message_sent_at', { useTz: true }).nullable()


      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}