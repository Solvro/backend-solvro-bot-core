import { MessageFlags, SlashCommandBuilder } from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

import DiscordActivity from "#models/discord_activity";

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
    .setName("discord_activity")
    .setDescription(
      "Show discord activity for a specific user in a given date range",
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

    const user = interaction.options.get("user")?.user;
    const member = interaction.guild?.members.cache.get(user?.id ?? "");
    const startDateStr = interaction.options.getString("start_date");
    const endDateStr = interaction.options.getString("end_date");

    if (user === undefined || member === undefined) {
      await interaction.editReply({ content: "❌ Invalid user specified." });
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
    let query = DiscordActivity.query().where("discord_id", user.id);

    if (startDate !== null) {
      query = query.where("date", ">=", startDate);
    }

    query = query.where("date", "<=", endDate);

    const activity: (DiscordActivity & {
      $extras: { sum_count: number; avg_count: number; max_count: number };
    })[] = (await query
      .sum("message_count as sum_count")
      .avg("message_count as avg_count")
      .max("message_count as max_count")) as unknown as (DiscordActivity & {
      $extras: { sum_count: number; avg_count: number; max_count: number };
    })[];

    const messageCount = activity[0]?.$extras.sum_count ?? 0;
    const displayName = member.nickname ?? user.username;

    // Format period description
    let periodDesc = "all time";
    if (startDate !== null) {
      periodDesc = `${startDateStr} to ${endDateStr}`;
    } else if (startDateStr !== null) {
      periodDesc = `since ${startDateStr}`;
    } else if (endDateStr !== null) {
      periodDesc = `up to ${endDateStr}`;
    }

    // Calculate number of days
    const daysDiff =
      startDate !== null
        ? Math.ceil(
            (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
          ) + 1
        : null;

    let extraStats = "";
    if (daysDiff !== null && daysDiff > 1) {
      const avgPerDay = activity[0]?.$extras.avg_count ?? 0;
      const maxPerDay = activity[0]?.$extras.max_count ?? 0;
      extraStats = `\n🗓️ Avg per day: **${avgPerDay.toFixed(1)}**, Max in a day: **${maxPerDay}**`;
    }

    await interaction.editReply({
      content: `📊 **${displayName}** sent **${messageCount} messages** during \`${periodDesc}\`.${extraStats}`,
    });
  },
);

export default command;
