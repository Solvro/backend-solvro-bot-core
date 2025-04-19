import { commands } from '#app/discord/index'
import { client } from '#app/discord/index'
import env from '#start/env'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { REST, Routes, RESTPutAPIApplicationCommandsResult } from 'discord.js'

export default class DeployCommands extends BaseCommand {
  static commandName = 'discord:deploy'
  static description = 'Deploy slash commands with Discord REST API'

  static options: CommandOptions = {}

  async run() {
    await client.start()
    const rest = new REST({ version: '10' }).setToken(env.get('DISCORD_TOKEN'))
    const discordClientId = env.get('DISCORD_CLIENT_ID')
    const discordGuildId = env.get('DISCORD_GUILD_ID')
    console.debug(`Discord Client ID: ${discordClientId}`)
    console.debug(`Discord Guild ID: ${discordGuildId}`)
    try {
      console.log(`Started refreshing ${commands.length} application (/) commands.`)
      const commandResults = await Promise.all(commands.map((command) => command.cmd()))
      const body = commandResults.map((cmd) => cmd.toJSON())

      const data = (await rest.put(
        Routes.applicationGuildCommands(discordClientId, discordGuildId),
        {
          body,
        }
      )) as RESTPutAPIApplicationCommandsResult

      console.log(`Successfully reloaded ${data.length} application (/) commands.`)
    } catch (error) {
      console.error(error)
    } finally {
      await client.destroy()
    }
  }
}
