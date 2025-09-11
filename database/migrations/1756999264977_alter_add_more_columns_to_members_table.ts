import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'members'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.date('join_date').nullable()
      table.string('faculty').nullable()
      table.string('field_of_study').nullable()
      table.string('study_year').nullable()
      table.string('messenger_url').nullable()
      table.string('current_section').nullable()
      table.string('current_role').nullable()
      table.string('current_projects').nullable()
      table.string('other_projects').nullable()
      table.string('other_experiences').nullable()
      table.string('github_username').nullable()

      table.enu('status', ['new', 'active', 'inactive']).defaultTo('new')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('join_date')
      table.dropColumn('faculty')
      table.dropColumn('field_of_study')
      table.dropColumn('study_year')
      table.dropColumn('messenger_url')
      table.dropColumn('status')
      table.dropColumn('github_username')
      table.dropColumn('current_section')
      table.dropColumn('current_role')
      table.dropColumn('other_projects')
      table.dropColumn('other_experiences')
      table.dropColumn('current_projects')
    })
  }
}