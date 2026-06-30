import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";

import OfficeStatusMessage from "#models/office_status_message";

import { StaticCommand } from "../commands.js";
import type { SlashCommand } from "../commands.js";

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("office_widget_remove")
    .setDescription(
      "Stop recieving updates from office camera on this channel",
    ),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { default: officeCameraService } =
      await import("#services/office_camera_service");

    const existingWidget = await OfficeStatusMessage.query()
      .where("channelId", interaction.channelId)
      .first();

    if (!existingWidget) {
      await interaction.editReply({
        content: "❌ This channel doesn't have a camera widget",
      });
      return;
    }

    await officeCameraService.removeChannelFromUpdateList(
      interaction.channelId,
    );

    await interaction.editReply({ content: "✅ Widget successfully removed" });
  },
);

export default command;
