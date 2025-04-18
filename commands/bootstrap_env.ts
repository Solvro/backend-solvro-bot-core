import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

export default class BootstrapEnv extends BaseCommand {
  static commandName = 'bootstrap:env'
  static description = 'Bootstrap the environment variables'

  static options: CommandOptions = {}

  async run() {
    const sourcePath = join(process.cwd(), '.env.example')
    const destinationPath = join(process.cwd(), '.env')

    try {
      const fileExists = await fs
        .access(destinationPath)
        .then(() => true)
        .catch(() => false)

      if (fileExists) {
        const confirm = await this.prompt.confirm(
          '.env file already exists. Do you want to overwrite it?'
        )
        if (!confirm) {
          this.logger.info('Operation cancelled.')
          return
        }
      }

      await fs.copyFile(sourcePath, destinationPath)
      this.logger.success('.env file has been created successfully.')
      this.logger.info('Please update the .env file with your environment variables.')
    } catch (error) {
      this.logger.error('Failed to create .env file:', error.message)
    }
  }
}
