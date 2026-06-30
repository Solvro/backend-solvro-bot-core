import type { StringSelectMenuInteraction } from "discord.js";

import logger from "@adonisjs/core/services/logger";

import { deleteConfig, getConfig } from "../shared/activity_report_config.js";

export async function handleStatsSelect(
  interaction: StringSelectMenuInteraction,
) {
  const config = getConfig(interaction.user.id, interaction.message.id);
  config.stats = interaction.values;

  await interaction.update({
    content: `✅ **Report Generation Started**

**Configuration:**
• **Format:** ${config.fileType?.toUpperCase()}
• **Date Range:** ${config.startDate || "All time"} → ${config.endDate || "Today"}
• **Statistics:** ${config.stats.join(", ")}

🔄 Generating your activity report (might take a few seconds)...`,
    components: [], // Remove the select menu
  });

  try {
    // Generate the report
    const activityReportService = (
      await import("#services/activity_report_service")
    ).default;
    const reportFile = await activityReportService.generateReport({
      fileType: config.fileType as "csv" | "excel",
      startDate: config.startDate,
      endDate: config.endDate,
      stats: config.stats,
    });

    // Send the report file
    await interaction.followUp({
      content: `📊 **Activity Report Generated Successfully!**\n\n**Summary:**\n• Format: ${config.fileType?.toUpperCase()}\n• Date Range: ${config.startDate || "All time"} → ${config.endDate || "Today"}\n• Statistics: ${config.stats.join(", ")}\n\nYour report is attached below.`,
      files: [reportFile],
      ephemeral: true,
    });

    logger.info("Activity report generated and sent successfully", {
      userId: interaction.user.id,
      config,
    });
  } catch (error: any) {
    logger.error("Failed to generate activity report", { error, config });

    await interaction.followUp({
      content: `❌ **Report Generation Failed**\n\nAn error occurred while generating the report. Please try again or contact an administrator.\n\nError: ${error.message}`,
      ephemeral: true,
    });
  } finally {
    // Clean up stored config
    deleteConfig(interaction.user.id, interaction.message.id);
  }
}

export const activityReportSelectMenuHandlers = {
  activity_report_stats_select: handleStatsSelect,
};
