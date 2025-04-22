import env from '#start/env'
import { Client, Collection, GatewayIntentBits, MessageFlags } from 'discord.js'

import userInfoCommand from '#app/discord/commands/utility/user'
import recordCommand from '#app/discord/commands/transcriber/record'
import stopRecordingCommand from '#app/discord/commands/transcriber/stop_recording'
import { SlashCommand } from './commands/commands.js'
import logger from '@adonisjs/core/services/logger'

export const commands = [userInfoCommand, recordCommand, stopRecordingCommand]

export class DiscordClient extends Client {
  commands: Collection<string, SlashCommand>
  constructor(slashCommands?: SlashCommand[]) {
    super({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates] })
    if (slashCommands) {
      this.commands = new Collection(slashCommands.map((command) => [command.name(), command]))
    } else {
      this.commands = new Collection()
    }
  }

  async start() {
    await this.login(env.get('DISCORD_TOKEN'))
  }

  async registerListeners() {
    this.once('ready', (readyClient) => {
      logger.info(`Ready! Logged in as ${readyClient.user.tag}`)
    })
    this.on('interactionCreate', async (interaction) => {
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
    })
  }
}

export const client = new DiscordClient()
