import { BaseSchema } from '@adonisjs/lucid/schema'
import { RecordingStatus } from '#models/recording'

export default class extends BaseSchema {
  protected tableName = 'recordings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.timestamp('created_at')
      table.timestamp('updated_at')

      table.text('name').nullable()
      table.text('transcription').nullable()
      table.text('status').defaultTo(RecordingStatus.PENDING)
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
