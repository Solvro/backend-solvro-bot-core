import env from '#start/env'
import { Client, Collection, GatewayIntentBits, MessageFlags } from 'discord.js'

import userInfoCommand from '#app/discord/commands/utility/user'
import recordCommand from '#app/discord/commands/transcriber/record'
import { SlashCommand } from './commands/commands.js'

export const commands = [userInfoCommand, recordCommand]

export class DiscordClient extends Client {
  commands: Collection<string, SlashCommand>
  constructor(slashCommands?: SlashCommand[]) {
    super({ intents: [GatewayIntentBits.Guilds] })
    if (slashCommands) {
      this.commands = new Collection(slashCommands.map((command) => [command.name(), command]))
    } else {
      this.commands = new Collection()
    }
  }

  async start() {
    client.once('ready', (readyClient) => {
      console.log(`Ready! Logged in as ${readyClient.user.tag}`)
    })

    client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return

      const command = (interaction.client as DiscordClient).commands.get(interaction.commandName)

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`)
        return
      }

      try {
        await command.execute(interaction)
      } catch (error) {
        console.error(error)
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
      console.log(interaction)
    })
    await this.login(env.get('DISCORD_TOKEN'))
  }
}

export const client = new DiscordClient()
