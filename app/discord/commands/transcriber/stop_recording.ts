import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";

import { StaticCommand } from "#app/discord/commands/commands";
import type { SlashCommand } from "#app/discord/commands/commands";
import Meeting, { RecordingStatus } from "#models/meetings";
import env from "#start/env";

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("stop_recording")
    .setDescription("Stop recording and leave the voice channel"),
  async (interaction: CommandInteraction) => {
    const meeting = await Meeting.query()
      .where("recording_status", RecordingStatus.RECORDING)
      .first();
    if (meeting === null) {
      await interaction.reply({
        content: "No recording in progress",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    meeting.recordingStatus = RecordingStatus.STOPPING;
    await meeting.save();
    const response = await fetch(`${env.get("TRANSCRIBER_URL")}/stop`, {
      method: "POST",
    });
    if (!response.ok) {
      await interaction.reply({
        content: "Failed to stop recording",
        flags: MessageFlags.Ephemeral,
      });
      meeting.recordingStatus = RecordingStatus.ERROR;
      await meeting.save();
      return;
    }

    await interaction.reply({ content: "Stopped recording" });
  },
);
export default command;
