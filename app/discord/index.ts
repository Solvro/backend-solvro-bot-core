import env from '#start/env'
import { Client, Collection, GatewayIntentBits } from 'discord.js'

import userInfoCommand from '#app/discord/commands/utility/user'
import recordCommand from '#app/discord/commands/transcriber/record'
import stopRecordingCommand from '#app/discord/commands/transcriber/stop_recording'
import meetingSummaryCommand from '#app/discord/commands/transcriber/meeting_summary'
import monitorAttendanceCommand from '#app/discord/commands/attendance/monitor'
import discordActivityCommand from '#app/discord/commands/activity/discord_activity'
import githubActivityCommand from '#app/discord/commands/activity/github_activity'
import stopMonitoringAttendanceCommand from '#app/discord/commands/attendance/stop_monitoring'
import officeStatusCommand from '#app/discord/commands/office/office_status'
import showAttendanceCommand from '#app/discord/commands/attendance/show_attendance'
import createMeeting from '#app/discord/commands/meeting/create_meeting'
import archive from './commands/archive_channel/archive.ts'
import { SlashCommand } from './commands/commands.js'
import { ready } from './handlers/clientReadyHandler.js'
import Meeting from '#models/meetings'
import logger from '@adonisjs/core/services/logger'
import {guildMemberAdd} from "./handlers/membersHandler.ts";
import { setupInteractionHandler } from './handlers/interactionHandler.js'
import { commandsHandler } from './handlers/commandHandler.js'
import { monitorVoiceState } from './handlers/voiceStateHandler.js'
import { messagesHandler } from './handlers/messagesHandler.js'

export const commands = [
  userInfoCommand,
  recordCommand,
  stopRecordingCommand,
  monitorAttendanceCommand,
  stopMonitoringAttendanceCommand,
  createMeeting,
  officeStatusCommand,
  showAttendanceCommand,
  meetingSummaryCommand,
  discordActivityCommand,
  githubActivityCommand,
  archive,
]

export class DiscordClient extends Client {
  commands: Collection<string, SlashCommand>
  constructor(slashCommands?: SlashCommand[]) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
      ],
    })
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
    this.on('interactionCreate', commandsHandler)
    this.on('messageCreate', messagesHandler)
    this.on('guildMemberAdd', guildMemberAdd)

    setupInteractionHandler(this)
  }

  private displayAvailableCommands() {
    const prompt = this.commands.map((_, commandName) => `/${commandName}`).join('\n')
    logger.info(`Available Discord commands:\n${prompt}`)
  }
}

export const client = new DiscordClient(commands)
