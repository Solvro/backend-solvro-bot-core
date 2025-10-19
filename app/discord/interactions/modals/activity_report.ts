import { ModalSubmitInteraction } from 'discord.js'
import { getConfig } from '../shared/activity_report_config.js'

function parseDate(dateString: string): Date | null {
    const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
    const match = dateString.match(dateRegex)

    if (!match) {
        return null
    }

    const [, year, month, day] = match
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

    if (isNaN(date.getTime())) {
        return null
    }

    if (
        date.getFullYear() !== parseInt(year) ||
        date.getMonth() !== parseInt(month) - 1 ||
        date.getDate() !== parseInt(day)
    ) {
        return null
    }

    return date
}

export async function handleDateModalSubmit(interaction: ModalSubmitInteraction) {
    // Extract message ID from custom ID (format: "activity_report_start_date_modal:messageId")
    const [modalType, messageId] = interaction.customId.split(':')
    
    if (!messageId) {
        await interaction.reply({
            content: '❌ Unable to find the original message. Please try again.',
            ephemeral: true,
        })
        return
    }

    const config = getConfig(interaction.user.id, messageId)

    if (modalType === 'activity_report_start_date_modal') {
        const dateValue = interaction.fields.getTextInputValue('start_date')
        const parsedDate = parseDate(dateValue)

        if (!parsedDate) {
            await interaction.reply({
                content: `❌ Invalid date format: \`${dateValue}\`. Please use YYYY-MM-DD format (e.g., 2025-01-15).`,
                ephemeral: true,
            })
            return
        }

        config.startDate = dateValue
    } else if (modalType === 'activity_report_end_date_modal') {
        const dateValue = interaction.fields.getTextInputValue('end_date')
        const parsedDate = parseDate(dateValue)

        if (!parsedDate) {
            await interaction.reply({
                content: `❌ Invalid date format: \`${dateValue}\`. Please use YYYY-MM-DD format (e.g., 2025-10-19).`,
                ephemeral: true,
            })
            return
        }

        config.endDate = dateValue
    }

    // Fetch and update the original message
    try {
        const channel = interaction.channel
        if (!channel || !channel.isTextBased()) {
            await interaction.reply({
                content: '❌ Unable to access the channel.',
                ephemeral: true,
            })
            return
        }

        const message = await channel.messages.fetch(messageId)
        
        // Update the embed with the new configuration
        const currentEmbed = message.embeds[0]
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

        await message.edit({
            embeds: [newEmbed],
            components: message.components,
        })

        await interaction.reply({
            content: '✅ Date updated successfully!',
            ephemeral: true,
        })
    } catch (error) {
        console.error('Error updating message:', error)
        await interaction.reply({
            content: '❌ Failed to update the message. Please try again.',
            ephemeral: true,
        })
    }
}
