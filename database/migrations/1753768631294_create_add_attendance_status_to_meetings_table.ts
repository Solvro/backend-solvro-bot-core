import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'meetings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.enum('attendance_status', ['not_monitored', 'monitoring', 'finished_monitoring'])
        .notNullable()
        .defaultTo('not_monitored')
    })

    // translate existing data into new column
    this.defer(async (db) => {
      await db
        .from(this.tableName)
        .where('is_monitored', true)
        .update('attendance_status', 'finished_monitoring')

      await db
        .from(this.tableName)
        .where((query) => {
          query.where('is_monitored', false).orWhereNull('is_monitored')
        })
        .update('attendance_status', 'not_monitored')
    })

    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('is_monitored')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.boolean('is_monitored').defaultTo(false)

      table.dropColumn('attendance_status')
    })
  }
}