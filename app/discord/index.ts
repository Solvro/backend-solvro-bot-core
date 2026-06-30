import { Client, Collection, GatewayIntentBits } from "discord.js";

import logger from "@adonisjs/core/services/logger";

import activityReportCommand from "#app/discord/commands/activity/activity_report";
import channel_activity from "#app/discord/commands/activity/channel_activity";
import discordActivityCommand from "#app/discord/commands/activity/discord_activity";
import githubActivityCommand from "#app/discord/commands/activity/github_activity";
import retryUpload from "#app/discord/commands/admin/retry_upload";
import uploadStatus from "#app/discord/commands/admin/upload_status";
import archive from "#app/discord/commands/archive_channel/archive";
import monitorAttendanceCommand from "#app/discord/commands/attendance/monitor";
import showAttendanceCommand from "#app/discord/commands/attendance/show_attendance";
import stopMonitoringAttendanceCommand from "#app/discord/commands/attendance/stop_monitoring";
import officeAvailability from "#app/discord/commands/calendar/availability";
import calendarLink from "#app/discord/commands/calendar/link";
import calendarNew from "#app/discord/commands/calendar/new";
import printerAvailability from "#app/discord/commands/calendar/printer/availability";
import printerReserve from "#app/discord/commands/calendar/printer/reserve";
import createMeeting from "#app/discord/commands/meeting/create_meeting";
import officeCameraDowntimeAlertCommand from "#app/discord/commands/office/office_down_alert";
import officeWidgetCommand from "#app/discord/commands/office/office_widget";
import officeWidgetRemoveCommand from "#app/discord/commands/office/office_widget_remove";
import meetingSummaryCommand from "#app/discord/commands/transcriber/meeting_summary";
import recordCommand from "#app/discord/commands/transcriber/record";
import stopRecordingCommand from "#app/discord/commands/transcriber/stop_recording";
import transcription from "#app/discord/commands/transcriber/transcription";
import memberInfoCommand from "#app/discord/commands/utility/member_info";
import userInfoCommand from "#app/discord/commands/utility/user";
import weeklyStart from "#app/discord/commands/weekly/weekly_start";
import weeklyStop from "#app/discord/commands/weekly/weekly_stop";
import { commandsHandler } from "#app/discord/handlers/command_handler";
import { setupInteractionHandler } from "#app/discord/handlers/interaction_handler";
import { guildMemberAdd } from "#app/discord/handlers/members_handler";
import { messagesHandler } from "#app/discord/handlers/messages_handler";
import { monitorVoiceState } from "#app/discord/handlers/voice_state_handler";
import Meeting, { AttendanceStatus } from "#models/meetings";
import env from "#start/env";

import type { SlashCommand } from "./commands/commands.js";
import { ready } from "./handlers/client_ready_handler.js";

export const commands = [
  userInfoCommand,
  memberInfoCommand,
  recordCommand,
  stopRecordingCommand,
  monitorAttendanceCommand,
  stopMonitoringAttendanceCommand,
  createMeeting,
  officeWidgetCommand,
  officeWidgetRemoveCommand,
  officeCameraDowntimeAlertCommand,
  showAttendanceCommand,
  meetingSummaryCommand,
  discordActivityCommand,
  githubActivityCommand,
  activityReportCommand,
  archive,
  channel_activity,
  calendarNew,
  transcription,
  weeklyStart,
  weeklyStop,
  uploadStatus,
  retryUpload,
  officeAvailability,
  calendarLink,
  printerReserve,
  printerAvailability,
];

export class DiscordClient extends Client {
  commands: Collection<string, SlashCommand>;
  constructor(slashCommands?: SlashCommand[]) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
      ],
    });
    if (slashCommands !== undefined) {
      this.commands = new Collection(
        slashCommands.map((command) => [command.name(), command]),
      );
    } else {
      this.commands = new Collection();
    }
  }

  async start() {
    this.displayAvailableCommands();
    this.registerListeners();

    const meeting = await Meeting.findBy({
      attendanceStatus: AttendanceStatus.MONITORING,
    });
    if (meeting !== null && this.listeners("voiceStateUpdate").length === 0) {
      this.on("voiceStateUpdate", monitorVoiceState);
      logger.debug("Registered attendance monitoring listener");
    }

    await this.loginBot();
  }

  async loginBot() {
    await this.login(env.get("DISCORD_TOKEN"));
  }

  private registerListeners() {
    this.once("ready", ready);
    this.on("interactionCreate", commandsHandler);
    this.on("guildMemberAdd", guildMemberAdd);
    this.on("messageCreate", messagesHandler);

    setupInteractionHandler(this);
  }

  private displayAvailableCommands() {
    const prompt = this.commands
      .map((_, commandName) => `/${commandName}`)
      .join("\n");
    logger.info(`Available Discord commands:\n${prompt}`);
  }

  public async getGuild() {
    return await client.guilds.fetch(env.get("DISCORD_GUILD_ID"));
  }
}

export const client = new DiscordClient(commands);
