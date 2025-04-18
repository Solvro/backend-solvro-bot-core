import { client, SlashCommand } from '#app/discord/index'
import env from '#start/env'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { CommandInteraction, REST, Routes, SlashCommandBuilder } from 'discord.js'

export default class DeployCommands extends BaseCommand {
  static commandName = 'discord:deploy'
  static description = 'Deploy slash commands with Discord REST API'

  static options: CommandOptions = {}

  async run() {
    const commands: any[] = []
    const testCommand: SlashCommand = {
      data: new SlashCommandBuilder().setName('test').setDescription('Test command'),
      execute: async (interaction: CommandInteraction) => {
        await interaction.reply('This is a test command')
      },
    }

    client.commands.set(testCommand.data.name, testCommand)
    commands.push(testCommand.data.toJSON())

    const rest = new REST({ version: '10' }).setToken(env.get('DISCORD_TOKEN'))

    try {
      console.log(`Started refreshing ${commands.length} application (/) commands.`)

      const data = (await rest.put(
        Routes.applicationGuildCommands(env.get('DISCORD_CLIENT_ID'), env.get('DISCORD_GUILD_ID')),
        {
          body: commands,
        }
      )) as { length: number }

      console.log(`Successfully reloaded ${data.length} application (/) commands.`)
    } catch (error) {
      console.error(error)
    }
  }
}
