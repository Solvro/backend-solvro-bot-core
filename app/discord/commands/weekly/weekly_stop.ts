import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";

import logger from "@adonisjs/core/services/logger";

import { monitorVoiceState } from "#app/discord/handlers/voice_state_handler";
import { client } from "#app/discord/index";
import Meeting, { AttendanceStatus, RecordingStatus } from "#models/meetings";
import env from "#start/env";

import { StaticCommand } from "../commands.js";
import type { SlashCommand } from "../commands.js";

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("weekly_stop")
    .setDescription("Stops recording and attendance monitoring"),
  async (interaction: CommandInteraction) => {
    const meeting = await Meeting.query()
      .where("recording_status", RecordingStatus.RECORDING)
      .first();

    if (meeting === null) {
      await interaction.reply({
        content: "❌ No weekly in progress",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Turn off attendance monitoring
    client.off("voiceStateUpdate", monitorVoiceState);
    meeting.attendanceStatus = AttendanceStatus.FinishedMonitoring;

    // Turn off transcription
    meeting.recordingStatus = RecordingStatus.STOPPING;
    await meeting.save();

    const response = await fetch(`${env.get("TRANSCRIBER_URL")}/stop`, {
      method: "POST",
    });

    if (!response.ok) {
      await interaction.reply({
        content: "❌ Failed to stop recording",
        flags: MessageFlags.Ephemeral,
      });
      meeting.recordingStatus = RecordingStatus.ERROR;
      await meeting.save();

      logger.error("Error stopping recording");
      return;
    }

    await interaction.reply({
      content:
        "✅ Weekly session ended successfully:\n- 🎤 Transcription is being processed and will be available shortly\n- 📋 Attendance tracking is complete\n- 💾 Files will be automatically uploaded to Google Drive when the summary is ready\n\nYou can:\n- 📄 View the transcription with `/transcription`\n- 🧠 See the meeting summary with `/meeting_summary`\n- 👥 View attendance with `/show_attendance`\n- 📊 Check upload status with `/upload_status`",
    });
  },
);

export default command;
