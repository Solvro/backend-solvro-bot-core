import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'meetings'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Simple Google Drive tracking
      table.string('google_drive_folder_id').nullable()
      table.boolean('files_uploaded_to_drive').defaultTo(false)
      table.timestamp('drive_upload_completed_at').nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('google_drive_folder_id')
      table.dropColumn('files_uploaded_to_drive')
      table.dropColumn('drive_upload_completed_at')
    })
  }
}