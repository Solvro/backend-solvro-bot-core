import { BaseSchema } from '@adonisjs/lucid/schema'
import { RecordingStatus } from '#models/meetings'

export default class extends BaseSchema {
  protected tableName = 'meetings'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')

      table.text('name').nullable()
      table.boolean('is_monitored').defaultTo(false)
      table.text('discord_channel_id').nullable()
      table.text('transcription').nullable()
      table.text('recording_status').nullable().defaultTo(RecordingStatus.PENDING)
      table.timestamp('finished_at').nullable()

      table.timestamp('created_at')
      table.timestamp('updated_at')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
