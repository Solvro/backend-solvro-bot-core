import logger from '@adonisjs/core/services/logger'
import { Client } from 'discord.js'

export async function ready(readyClient: Client<true>) {
  logger.info(`Discord bot is ready! Logged in as ${readyClient.user.tag}`)
}
