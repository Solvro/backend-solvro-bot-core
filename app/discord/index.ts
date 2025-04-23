import env from '#start/env'
import { Client, Collection, GatewayIntentBits } from 'discord.js'

import userInfoCommand from '#app/discord/commands/utility/user'
import recordCommand from '#app/discord/commands/transcriber/record'
import stopRecordingCommand from '#app/discord/commands/transcriber/stop_recording'
import monitorAttendanceCommand from '#app/discord/commands/attendance/monitor'
import stopMonitoringAttendanceCommand from '#app/discord/commands/attendance/stop_monitoring'
import createMeeting from '#app/discord/commands/meeting/create_meeting'
import { SlashCommand } from './commands/commands.js'
import { interactionCreate, ready } from './event_handlers.js'

export const commands = [
  userInfoCommand,
  recordCommand,
  stopRecordingCommand,
  monitorAttendanceCommand,
  stopMonitoringAttendanceCommand,
  createMeeting,
]

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
    this.once('ready', ready)
    this.on('interactionCreate', interactionCreate)
  }
}

export const client = new DiscordClient()
