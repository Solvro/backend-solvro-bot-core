import { StringSelectMenuInteraction } from 'discord.js'
import { getConfig, deleteConfig } from '../shared/activity_report_config.js'

export async function handleStatsSelect(interaction: StringSelectMenuInteraction) {
    const config = getConfig(interaction.user.id, interaction.message.id)
    config.stats = interaction.values

    await interaction.update({
        content: `✅ **Report Generation Started**

**Configuration:**
• **Format:** ${config.fileType?.toUpperCase()}
• **Date Range:** ${config.startDate || 'All time'} → ${config.endDate || 'Today'}
• **Statistics:** ${config.stats.join(', ')}

🔄 Generating your activity report (might take a few seconds)...`,
        components: [], // Remove the select menu
    })

    // TODO: Implement actual report generation logic here
    console.log('Report configuration:', config)

    deleteConfig(interaction.user.id, interaction.message.id)

    setTimeout(async () => {
        await interaction.followUp({
            content: '� Report generation logic to be implemented. Configuration received successfully!',
            ephemeral: true,
        })
    }, 1000)
}

export const activityReportSelectMenuHandlers = {
    activity_report_stats_select: handleStatsSelect,
}
