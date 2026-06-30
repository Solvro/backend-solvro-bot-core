import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { CommandInteraction } from "discord.js";

import OfficeCameraDownMessage from "#models/office_camera_down_message";

import { StaticCommand } from "../commands.js";
import type { SlashCommand } from "../commands.js";

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("office_down_alert")
    .setDescription(
      "Subscribe or unsubscribe from office camera downtime alerts (sent to dm)",
    ),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const downMessage = await OfficeCameraDownMessage.query()
      .where("discordUserId", interaction.user.id)
      .first();

    if (downMessage) {
      await downMessage.delete();
      await interaction.editReply(
        "You have been unsubscribed from office camera downtime alerts.",
      );
    } else {
      await OfficeCameraDownMessage.create({
        discordUserId: interaction.user.id,
        lastMessageSentAt: null,
      });
      await interaction.editReply(
        "You have been subscribed to office camera downtime alerts.",
      );
    }
  },
);

export default command;
