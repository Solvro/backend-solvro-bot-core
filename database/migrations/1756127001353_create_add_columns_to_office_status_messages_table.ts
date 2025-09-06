import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'office_status_messages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('image_path').nullable()
      table.integer('count').nullable()
      table.timestamp('last_presence', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('image_path');
      table.dropColumn('count');
      table.dropColumn('last_presence');
    })
  }
}