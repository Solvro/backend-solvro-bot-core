import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'meeting_member'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table
        .integer('meeting_id')
        .notNullable()
        .references('id')
        .inTable('meetings')
        .onDelete('CASCADE')
      table
        .integer('member_id')
        .notNullable()
        .references('id')
        .inTable('members')
        .onDelete('CASCADE')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
