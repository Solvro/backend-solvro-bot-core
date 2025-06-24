import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'github_activities'

    async up() {
        this.schema.createTable(this.tableName, (table) => {
            table.increments('id')

            table.string('github_id').nullable()
            table.enum('type', ['commit', 'pr', 'issue', 'review', 'other'])
            table.string('message').nullable();
            table.string('author_github_id')
            table.string('repo')
            table.timestamp('date', { useTz: true }).notNullable()

            table.timestamp('created_at')
            table.timestamp('updated_at')
        })
    }

    async down() {
        this.schema.dropTable(this.tableName)
    }
}