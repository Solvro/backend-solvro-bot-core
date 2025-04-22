import { client } from '#app/discord/index'
import { commands } from '#app/discord/index'
import logger from '@adonisjs/core/services/logger'

commands.forEach((command) => {
  logger.info(`Command: ${command.name()}`)
  client.commands.set(command.name(), command)
})

await client.start()
await client.registerListeners()
