import env from '#start/env'
import { Client, Collection, GatewayIntentBits } from 'discord.js'

import userInfoCommand from '#app/discord/commands/utility/user'
import recordCommand from '#app/discord/commands/transcriber/record'
import stopRecordingCommand from '#app/discord/commands/transcriber/stop_recording'
import monitorAttendanceCommand from '#app/discord/commands/attendance/monitor'
import stopMonitoringAttendanceCommand from '#app/discord/commands/attendance/stop_monitoring'
import officeStatusCommand from '#app/discord/commands/office/office_status'
import createMeeting from '#app/discord/commands/meeting/create_meeting'
import { SlashCommand } from './commands/commands.js'
import { interactionCreate, monitorVoiceState, ready } from './event_handlers.js'
import Meeting from '#models/meetings'
import logger from '@adonisjs/core/services/logger'

export const commands = [
  userInfoCommand,
  recordCommand,
  stopRecordingCommand,
  monitorAttendanceCommand,
  stopMonitoringAttendanceCommand,
  createMeeting,
  officeStatusCommand,
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
    this.displayAvailableCommands()
    this.registerListeners()

    const meeting = await Meeting.findBy({ isMonitored: true })
    if (meeting && this.listeners('voiceStateUpdate').length === 0) {
      this.on('voiceStateUpdate', monitorVoiceState)
      logger.debug('Registered attendance monitoring listener')
    }

    await this.login(env.get('DISCORD_TOKEN'))
  }

  private registerListeners() {
    this.once('ready', ready)
    this.on('interactionCreate', interactionCreate)
  }

  private displayAvailableCommands() {
    const prompt = this.commands.map((_, commandName) => `/${commandName}`).join('\n')
    logger.info(`Available Discord commands:\n${prompt}`)
  }
}

export const client = new DiscordClient(commands)
