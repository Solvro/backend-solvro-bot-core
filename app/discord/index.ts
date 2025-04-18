import env from '#start/env'
import {
  Client,
  Collection,
  CommandInteraction,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js'
import testCommand from '#app/discord/commands/utility/user'

export const commands = [testCommand]

class DiscordClient extends Client {
  commands: Collection<string, SlashCommand>
  constructor(slashCommands?: SlashCommand[]) {
    super({ intents: [GatewayIntentBits.Guilds] })
    if (slashCommands) {
      this.commands = new Collection(slashCommands.map((command) => [command.data.name, command]))
    } else {
      this.commands = new Collection()
    }
  }

  async start() {
    await this.login(env.get('DISCORD_TOKEN'))
  }
}

export interface SlashCommand {
  data: SlashCommandBuilder
  execute(interaction: CommandInteraction): Promise<void>
}

export const client = new DiscordClient(commands)

client.commands.set(testCommand.data.name, testCommand)

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
