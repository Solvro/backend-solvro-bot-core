import logger from '@adonisjs/core/services/logger'
import { CacheType, Interaction, MessageFlags } from 'discord.js'
import { DiscordClient } from '../index.js'

export async function commandsHandler(interaction: Interaction<CacheType>) {
  if (!interaction.isChatInputCommand()) return

  const command = (interaction.client as DiscordClient).commands.get(interaction.commandName)

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    logger.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      })
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      })
    }
  }
  logger.trace(interaction)
}
