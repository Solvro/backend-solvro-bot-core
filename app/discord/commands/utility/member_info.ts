import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

import Member from "#models/member";

import { StaticCommand } from "../commands.js";
import type { SlashCommand } from "../commands.js";

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("member_info")
    .setDescription("Show information about a specific member")
    .addUserOption((option) =>
      option.setName("user").setDescription("User").setRequired(true),
    ),
  async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ ephemeral: true });

    const user = interaction.options.getUser("user", true);

    const member = await Member.query().where("discord_id", user.id).first();

    if (member === null) {
      await interaction.editReply({
        content: `❌ No member data found for ${user.tag}`,
      });
      return;
    }

    // Status emoji mapping
    const statusEmoji: Record<string, string> = {
      new: "🆕",
      active: "✅",
      inactive: "⚪",
    };

    const embed = new EmbedBuilder()
      .setColor("#2f3136")
      .setAuthor({
        name:
          `${member.firstName ?? ""} ${member.lastName ?? ""}`.trim() ||
          user.tag,
        iconURL: user.displayAvatarURL(),
      })
      .setDescription(
        `${statusEmoji[member.status]} **Status:** ${member.status.toUpperCase()}` +
          `\n📂 **Section:** ${member.currentSection ?? "N/A"}` +
          `\n🏢 **Projects:** ${member.currentProjects ?? "N/A"}` +
          `\n🎯 **Role:** ${member.currentRole ?? "N/A"}`,
      )
      .addFields(
        ...(member.indexNumber !== null
          ? [{ name: "🎓 Index", value: member.indexNumber, inline: true }]
          : []),
        ...(member.faculty !== null
          ? [{ name: "🏫 Faculty", value: member.faculty, inline: true }]
          : []),
        ...(member.fieldOfStudy !== null
          ? [{ name: "📘 Field", value: member.fieldOfStudy, inline: true }]
          : []),
        ...(member.studyYear !== null
          ? [{ name: "📅 Year", value: member.studyYear, inline: true }]
          : []),
        {
          name: "📆 Joined",
          value: member.joinDate.toDateString(),
          inline: true,
        },
        ...(member.email !== null
          ? [{ name: "📧 Email", value: member.email, inline: true }]
          : []),
        ...(member.phone !== null
          ? [{ name: "📞 Phone", value: member.phone, inline: true }]
          : []),
        ...(member.messengerUrl !== null
          ? [
              {
                name: "💬 Messenger",
                value: `[Profile](${member.messengerUrl})`,
                inline: true,
              },
            ]
          : []),
        ...(member.githubUrl !== null
          ? [
              {
                name: "💻 GitHub",
                value: `[${member.githubUsername ?? "profile"}](${member.githubUrl})`,
                inline: true,
              },
            ]
          : []),
      )
      .setFooter({
        text: `Discord ID: ${member.discordId}`,
      })
      .setTimestamp(member.updatedAt.toJSDate());

    await interaction.editReply({
      embeds: [embed],
    });
  },
);

export default command;
