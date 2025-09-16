import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'office_status_messages'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.timestamp('last_update', { useTz: true }).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('last_update');
    })
  }
}