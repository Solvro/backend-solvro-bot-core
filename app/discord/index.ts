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
import officeWidgetCommand from '#app/discord/commands/office/office_widget'
import officeWidgetRemoveCommand from '#app/discord/commands/office/office_widget_remove'
import showAttendanceCommand from '#app/discord/commands/attendance/show_attendance'
import createMeeting from '#app/discord/commands/meeting/create_meeting'
import archive from '#app/discord/commands/archive_channel/archive'
import channel_activity from '#app/discord/commands/activity/channel_activity'
import calendarAddEvent from '#app/discord/commands/calendar/add_event'
import calendarUpcomingEvent from '#app/discord/commands/calendar/upcoming_event'
import transcription from '#app/discord/commands/transcriber/transcription'
import weeklyStart from '#app/discord/commands/weekly/weekly_start';
import weeklyStop from '#app/discord/commands/weekly/weekly_stop';

import { SlashCommand } from './commands/commands.js'
import { ready } from './handlers/clientReadyHandler.js'
import Meeting, { AttendanceStatus } from '#models/meetings'
import logger from '@adonisjs/core/services/logger'

import { guildMemberAdd } from '#app/discord/handlers/membersHandler'
import { setupInteractionHandler } from '#app/discord/handlers/interactionHandler'
import { commandsHandler } from '#app/discord/handlers/commandHandler'
import { monitorVoiceState } from '#app/discord/handlers/voiceStateHandler'
import { messagesHandler } from '#app/discord/handlers/messagesHandler'

export const commands = [
  userInfoCommand,
  recordCommand,
  stopRecordingCommand,
  monitorAttendanceCommand,
  stopMonitoringAttendanceCommand,
  createMeeting,
  officeWidgetCommand,
  officeWidgetRemoveCommand,
  showAttendanceCommand,
  meetingSummaryCommand,
  discordActivityCommand,
  githubActivityCommand,
  archive,
  channel_activity,
  calendarAddEvent,
  calendarUpcomingEvent,
  transcription,
  weeklyStart,
  weeklyStop
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

    const meeting = await Meeting.findBy({ attendanceStatus: AttendanceStatus.MONITORING })
    if (meeting && this.listeners('voiceStateUpdate').length === 0) {
      this.on('voiceStateUpdate', monitorVoiceState)
      logger.debug('Registered attendance monitoring listener')
    }

    await this.login(env.get('DISCORD_TOKEN'))
  }

  private registerListeners() {
    this.once('ready', ready)
    this.on('interactionCreate', commandsHandler)
    this.on('guildMemberAdd', guildMemberAdd)
    this.on('messageCreate', messagesHandler)

    setupInteractionHandler(this)
  }

  private displayAvailableCommands() {
    const prompt = this.commands.map((_, commandName) => `/${commandName}`).join('\n')
    logger.info(`Available Discord commands:\n${prompt}`)
  }

  public async getGuild() {
    return await client.guilds.fetch(env.get('DISCORD_GUILD_ID'))
  }
}

export const client = new DiscordClient(commands)
