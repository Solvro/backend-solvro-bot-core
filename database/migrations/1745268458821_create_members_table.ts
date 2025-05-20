import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'members'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.text('first_name').nullable()
      table.text('last_name').nullable()
      table.text('email').nullable()
      table.text('phone').nullable()
      table.text('index_number').nullable()
      table.text('discord_id').notNullable().unique()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
