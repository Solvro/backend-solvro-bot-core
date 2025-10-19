import { ButtonInteraction, EmbedBuilder } from 'discord.js'
import { getConfig, deleteConfig } from '../shared/activity_report_config.js'

export async function handleSubmit(interaction: ButtonInteraction) {
    const config = getConfig(interaction.user.id, interaction.message.id)

    // Validate configuration
    if (config.stats.length === 0) {
        await interaction.reply({
            content: '❌ Please select at least one stat type to include in the report.',
            ephemeral: true,
        })
        return
    }

    if (!config.fileType) {
        await interaction.reply({
            content: '❌ Please select an export format (CSV or Excel).',
            ephemeral: true,
        })
        return
    }

    // Validate dates
    if (config.startDate && config.endDate) {
        const start = new Date(config.startDate)
        const end = new Date(config.endDate)
        if (start > end) {
            await interaction.reply({
                content: '❌ Start date must be before or equal to end date.',
                ephemeral: true,
            })
            return
        }
    }

    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(0x00ff00)
                .setTitle('✅ Report Generation Started')
                .setDescription('Your activity report is being generated...')
                .addFields(
                    {
                        name: 'Configuration',
                        value: `**Start Date:** ${config.startDate || 'All time'}\n**End Date:** ${config.endDate || 'Today'}\n**Stats:** ${config.stats.join(', ')}\n**Format:** ${config.fileType.toUpperCase()}`,
                    }
                )
                .setTimestamp(),
        ],
        components: [], // Remove all buttons
    })

    // TODO: Implement actual report generation logic here
    // You can call your report generation service with the config parameters
    console.log('Report configuration:', config)

    // Clean up stored config
    deleteConfig(interaction.user.id, interaction.message.id)

    // For now, send a placeholder message
    setTimeout(async () => {
        await interaction.followUp({
            content: '🚧 Report generation logic to be implemented. Configuration received successfully!',
            ephemeral: true,
        })
    }, 1000)
}

export async function handleCancel(interaction: ButtonInteraction) {
    deleteConfig(interaction.user.id, interaction.message.id)

    await interaction.update({
        embeds: [
            new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle('❌ Report Cancelled')
                .setDescription('Activity report configuration has been cancelled.')
                .setTimestamp(),
        ],
        components: [], // Remove all buttons
    })
}

// Export handlers
export const activityReportButtonHandlers = {
    activity_report_submit: handleSubmit,
    activity_report_cancel: handleCancel,
}
