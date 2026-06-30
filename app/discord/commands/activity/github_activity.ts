import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

import GithubActivity from "#models/github_activity";
import Member from "#models/member";

import { StaticCommand } from "../commands.js";
import type { SlashCommand } from "../commands.js";

function parseDate(dateString: string): Date | null {
  // Support formats: YYYY-MM-DD
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateRegex.exec(dateString);

  if (match === null) {
    return null;
  }

  const [, year, month, day] = match;
  const date = new Date(
    Number.parseInt(year),
    Number.parseInt(month) - 1,
    Number.parseInt(day),
  );

  // Check if date is valid
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  // Check if the parsed values match the input (catches invalid dates like 2025-02-30)
  if (
    date.getFullYear() !== Number.parseInt(year) ||
    date.getMonth() !== Number.parseInt(month) - 1 ||
    date.getDate() !== Number.parseInt(day)
  ) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("github_activity")
    .setDescription(
      "Show github activity for a specific user in a given date range",
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User to check activity for")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("start_date")
        .setDescription(
          "Start date (YYYY-MM-DD format, optional - defaults to all time)",
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("end_date")
        .setDescription(
          "End date (YYYY-MM-DD format, optional - defaults to today)",
        )
        .setRequired(false),
    ),
  async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const userDiscordId = interaction.options.getUser("user")?.id;
    const startDateStr = interaction.options.getString("start_date");
    const endDateStr = interaction.options.getString("end_date");

    if (userDiscordId === undefined) {
      await interaction.editReply({ content: "❌ Invalid user specified." });
      return;
    }

    const user = await Member.query()
      .where("discord_id", userDiscordId)
      .first();

    if (user === null) {
      await interaction.editReply({
        content: "❌ User not found in the database or has no GitHub ID.",
      });
      return;
    }

    if (user.githubId === null) {
      await interaction.editReply({
        content: "❌ User not found in the database or has no GitHub ID.",
      });
      return;
    }

    // Parse and validate dates
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (startDateStr !== null) {
      startDate = parseDate(startDateStr);
      if (startDate === null) {
        await interaction.editReply({
          content: `❌ Invalid start date format: \`${startDateStr}\`. Please use YYYY-MM-DD format (e.g., 2025-01-15).`,
        });
        return;
      }
    }

    if (endDateStr !== null) {
      endDate = parseDate(endDateStr);
      if (endDate === null) {
        await interaction.editReply({
          content: `❌ Invalid end date format: \`${endDateStr}\`. Please use YYYY-MM-DD format (e.g., 2025-10-19).`,
        });
        return;
      }
    } else {
      // Default end date to end of today
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    }

    // Validate start_date < end_date
    if (startDate !== null && startDate > endDate) {
      await interaction.editReply({
        content: `❌ Start date (\`${startDateStr}\`) must be before or equal to end date (\`${endDateStr}\`).`,
      });
      return;
    }

    // Build query
    let query = GithubActivity.query()
      .select("type")
      .where("author_github_id", user.githubId);

    if (startDate !== null) {
      query = query.where("date", ">=", startDate);
    }

    query = query.where("date", "<=", endDate);

    const activity: (GithubActivity & { $extras: { count: number } })[] =
      (await query
        .count("github_id as count")
        .groupBy("type")) as unknown as (GithubActivity & {
        $extras: { count: number };
      })[];

    // Format period description
    let periodDesc = "all time";
    if (startDate !== null) {
      periodDesc = `${startDateStr} to ${endDateStr}`;
    } else if (endDateStr !== null) {
      periodDesc = `up to ${endDateStr}`;
    }

    let summary = `📊 **${user.firstName} ${user.lastName}** GitHub activity during \`${periodDesc}\`:\n`;

    if (activity.length === 0) {
      summary += "No GitHub activity found.";
    } else {
      for (const row of activity) {
        const type = row.type;
        summary += `• **${type}**: ${row.$extras.count}\n`;
      }
    }

    await interaction.editReply({ content: summary });
  },
);

export default command;
