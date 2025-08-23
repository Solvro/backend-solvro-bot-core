import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'office_camera_statuses'

  async up() {
    this.schema.dropTable(this.tableName)
  }

  async down() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.integer('count').notNullable()
      table.timestamp('timestamp', { useTz: true }).notNullable()
      table.string('image_path').nullable()

      table.timestamps(true)
    })
  }
}