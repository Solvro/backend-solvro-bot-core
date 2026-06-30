import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";

import { monitorVoiceState } from "#app/discord/handlers/voice_state_handler";
import { client } from "#app/discord/index";
import Meeting, { AttendanceStatus } from "#models/meetings";

import { StaticCommand } from "../commands.js";
import type { SlashCommand } from "../commands.js";

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("stop_monitoring")
    .setDescription("Stop monitoring a voice channel for attendance"),
  async (interaction: CommandInteraction) => {
    client.off("voiceStateUpdate", monitorVoiceState);

    await Meeting.query()
      .where("attendance_status", AttendanceStatus.MONITORING)
      .update({ attendanceStatus: AttendanceStatus.FinishedMonitoring });

    await interaction.reply({
      content: "Stopped monitoring voice channel for attendance",
      flags: MessageFlags.Ephemeral,
    });
  },
);

export default command;
