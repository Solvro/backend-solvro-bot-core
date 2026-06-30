import {
  AttachmentBuilder,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";
import type { ChatInputCommandInteraction } from "discord.js";

import logger from "@adonisjs/core/services/logger";

import { toError } from "#app/helpers/error";
import env from "#start/env";

import { StaticCommand } from "../commands.js";

const command: StaticCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName("office_availability")
    .setDescription("Show office availability calendar for a selected week")
    .addIntegerOption((option) =>
      option
        .setName("week")
        .setDescription(
          "Which week to display (0 = this week, 1 = next week, etc.)",
        )
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(52),
    )
    .addIntegerOption((option) =>
      option
        .setName("start-hour")
        .setDescription("Start hour (0-23, default: 0)")
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(23),
    )
    .addIntegerOption((option) =>
      option
        .setName("end-hour")
        .setDescription("End hour (1-24, default: 24)")
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(24),
    )
    .addIntegerOption((option) =>
      option
        .setName("interval")
        .setDescription("Time slot interval in minutes (default: 15)")
        .setRequired(false)
        .addChoices(
          { name: "15 minutes", value: 15 },
          { name: "30 minutes", value: 30 },
          { name: "60 minutes", value: 60 },
        ),
    ),
  async (interaction: ChatInputCommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { default: googleCalendarService } =
        await import("#services/google_calendar_service");

      const weekOffset =
        (interaction.options.get("week")?.value as number) || 0;
      const startHour = (interaction.options.get("start-hour")?.value ??
        0) as number;
      const endHour = (interaction.options.get("end-hour")?.value ??
        24) as number;
      const interval = (interaction.options.get("interval")?.value ??
        15) as number;

      if (startHour >= endHour) {
        await interaction.editReply({
          content: "❌ Start hour must be less than end hour.",
        });
        return;
      }

      const today = new Date();
      const currentDay = today.getDay();
      const daysUntilMonday = currentDay === 0 ? -6 : 1 - currentDay;

      const startDate = new Date(today);
      startDate.setDate(today.getDate() + daysUntilMonday + weekOffset * 7);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      const events = await googleCalendarService.getEventsInRange(
        env.get("GOOGLE_CALENDAR_ID"),
        startDate,
        endDate,
      );

      const officeEvents = events.filter(
        (event: { location?: string }) =>
          (event.location?.toLowerCase().includes("biuro") ?? false) ||
          (event.location?.toLowerCase().includes("office") ?? false),
      );

      const imageBuffer = googleCalendarService.generateCalendarImage(
        startDate,
        officeEvents,
        {
          workStartHour: startHour,
          workEndHour: endHour,
          intervalMinutes: interval,
        },
      );

      const weekLabel =
        weekOffset === 0
          ? "This Week"
          : weekOffset === 1
            ? "Next Week"
            : `Week +${weekOffset}`;

      const attachment = new AttachmentBuilder(imageBuffer, {
        name: "office-availability.png",
      });

      await interaction.editReply({
        content: `📅 **Office Availability - ${weekLabel}**\n⏰ Hours: ${startHour}:00 - ${endHour}:00 (${interval}min intervals)`,
        files: [attachment],
      });
    } catch (error: unknown) {
      logger.error(
        { err: toError(error) },
        "Error checking office availability",
      );

      if (error instanceof Error) {
        if (
          error.message.includes("invalid_grant") ||
          error.message.includes("unauthorized")
        ) {
          await interaction.editReply({
            content:
              "❌ Google Calendar authentication failed. Please contact an administrator to re-authorize the bot.",
          });
        } else {
          await interaction.editReply({
            content: `❌ Failed to check office availability: ${error.message}`,
          });
        }
      } else {
        await interaction.editReply({
          content: "❌ Failed to check office availability: Unknown error",
        });
      }
    }
  },
);

export default command;
