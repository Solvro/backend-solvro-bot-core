import env from '#start/env'
import {
  Client,
  Collection,
  CommandInteraction,
  GatewayIntentBits,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js'

class DiscordClient extends Client {
  commands: Collection<string, SlashCommand>
  constructor() {
    super({ intents: [GatewayIntentBits.Guilds] })
    this.commands = new Collection()
  }

  async start() {
    await this.login(env.get('DISCORD_TOKEN'))
  }
}

export interface SlashCommand {
  data: SlashCommandBuilder
  execute(interaction: CommandInteraction): Promise<void>
}

export const client = new DiscordClient()

const testCommand: SlashCommand = {
  data: new SlashCommandBuilder().setName('test').setDescription('Test command'),
  async execute(interaction) {
    await interaction.reply('This is a test command')
  },
}

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
