import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
    protected tableName = 'members'

    async up() {
        this.schema.alterTable(this.tableName, (table) => {
            table.string('github_url').nullable();
            table.string('github_id').nullable();
        })
    }

    async down() {
        this.schema.alterTable(this.tableName, (table) => {
            table.dropColumn('github_url');
            table.dropColumn('github_id');
        })
    }
}