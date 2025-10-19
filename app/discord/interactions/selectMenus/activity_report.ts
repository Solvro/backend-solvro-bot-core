import { StringSelectMenuInteraction } from 'discord.js'
import { getConfig } from '../shared/activity_report_config.js'

export async function handleStatsSelect(interaction: StringSelectMenuInteraction) {
    const config = getConfig(interaction.user.id, interaction.message.id)
    config.stats = interaction.values

    // Update the embed with the new configuration
    const currentEmbed = interaction.message.embeds[0]
    const newEmbed = {
        ...currentEmbed.data,
        fields: [
            {
                name: '📅 Start Date',
                value: config.startDate ? `\`${config.startDate}\`` : '`Not set (all time)`',
                inline: true,
            },
            {
                name: '📅 End Date',
                value: config.endDate ? `\`${config.endDate}\`` : '`Not set (today)`',
                inline: true,
            },
            {
                name: '📈 Stats to Include',
                value:
                    config.stats.length > 0
                        ? config.stats.map((s) => `• ${s}`).join('\n')
                        : '`None selected`',
                inline: false,
            },
            {
                name: '📄 Export Format',
                value: config.fileType ? `\`${config.fileType.toUpperCase()}\`` : '`Not selected`',
                inline: true,
            },
        ],
    }

    await interaction.update({
        embeds: [newEmbed],
        components: interaction.message.components,
    })
}

export async function handleFileTypeSelect(interaction: StringSelectMenuInteraction) {
    const config = getConfig(interaction.user.id, interaction.message.id)
    config.fileType = interaction.values[0]

    // Update the embed with the new configuration
    const currentEmbed = interaction.message.embeds[0]
    const newEmbed = {
        ...currentEmbed.data,
        fields: [
            {
                name: '📅 Start Date',
                value: config.startDate ? `\`${config.startDate}\`` : '`Not set (all time)`',
                inline: true,
            },
            {
                name: '📅 End Date',
                value: config.endDate ? `\`${config.endDate}\`` : '`Not set (today)`',
                inline: true,
            },
            {
                name: '📈 Stats to Include',
                value:
                    config.stats.length > 0
                        ? config.stats.map((s) => `• ${s}`).join('\n')
                        : '`None selected`',
                inline: false,
            },
            {
                name: '📄 Export Format',
                value: config.fileType ? `\`${config.fileType.toUpperCase()}\`` : '`Not selected`',
                inline: true,
            },
        ],
    }

    await interaction.update({
        embeds: [newEmbed],
        components: interaction.message.components,
    })
}

export const activityReportSelectMenuHandlers = {
    activity_report_stats_select: handleStatsSelect,
    activity_report_file_type_select: handleFileTypeSelect,
}
