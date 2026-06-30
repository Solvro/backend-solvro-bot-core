import { ChannelType, MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

import Meeting from "#models/meetings";

import { StaticCommand } from "../commands.js";
import type { SlashCommand } from "../commands.js";

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("create_meeting")
    .setDescription("Create a meeting")
    .addStringOption((option) =>
      option
        .setName("meeting_name")
        .setDescription("Meeting name")
        .setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The ID of the voice channel to join")
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice),
    ),
  async (interaction: ChatInputCommandInteraction) => {
    const optCh = interaction.options.get("channel", true);
    if (optCh.channel === null || optCh.channel === undefined) {
      await interaction.reply({
        content: "Invalid channel option",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    const optMeetingName = interaction.options.get("meeting_name", true);
    const channelId = optCh.channel.id;
    await Meeting.create({
      name: String(optMeetingName.value),
      discordChannelId: channelId,
      recordingStatus: null,
    });
    await interaction.reply({
      content: `Meeting ${optMeetingName.value} created in channel ${optCh.channel.name}`,
      flags: MessageFlags.Ephemeral,
    });
  },
);

export default command;
