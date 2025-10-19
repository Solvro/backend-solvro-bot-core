import {
    ChatInputCommandInteraction,
    ActionRowBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    MessageFlags,
} from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('activity_report')
        .setDescription('Generate an activity report with selected statistics')
        .addStringOption((option) =>
            option
                .setName('file_type')
                .setDescription('Export file format')
                .setRequired(true)
                .addChoices(
                    { name: 'CSV', value: 'csv' },
                    // { name: 'Excel', value: 'excel' }
                )
        )
        .addStringOption((option) =>
            option
                .setName('start_date')
                .setDescription('Start date (YYYY-MM-DD format, optional - defaults to all time)')
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName('end_date')
                .setDescription('End date (YYYY-MM-DD format, optional - defaults to today)')
                .setRequired(false)
        ),
    async (interaction: ChatInputCommandInteraction) => {
        try {
            const fileType = interaction.options.getString('file_type', true)
            const startDateInput = interaction.options.getString('start_date')
            const endDateInput = interaction.options.getString('end_date')

            // Validate dates if provided
            if (startDateInput) {
                const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
                if (!dateRegex.test(startDateInput)) {
                    await interaction.reply({
                        content: `❌ Invalid start date format: \`${startDateInput}\`. Please use YYYY-MM-DD format (e.g., 2025-01-15).`,
                        flags: MessageFlags.Ephemeral,
                    })
                    return
                }
            }

            if (endDateInput) {
                const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
                if (!dateRegex.test(endDateInput)) {
                    await interaction.reply({
                        content: `❌ Invalid end date format: \`${endDateInput}\`. Please use YYYY-MM-DD format (e.g., 2025-10-19).`,
                        flags: MessageFlags.Ephemeral,
                    })
                    return
                }
            }

            // Validate start_date < end_date
            if (startDateInput && endDateInput) {
                const start = new Date(startDateInput)
                const end = new Date(endDateInput)
                if (start > end) {
                    await interaction.reply({
                        content: `❌ Start date (\`${startDateInput}\`) must be before or equal to end date (\`${endDateInput}\`).`,
                        flags: MessageFlags.Ephemeral,
                    })
                    return
                }
            }

            // Stats selection (multi-select menu)
            const statsRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('activity_report_stats_select')
                    .setPlaceholder('Select statistics to include in the report')
                    .setMinValues(1)
                    .setMaxValues(4)
                    .addOptions([
                        {
                            label: 'Discord Activity',
                            description: 'Message counts on Discord',
                            value: 'discord',
                            emoji: '💬',
                        },
                        {
                            label: 'GitHub Activity',
                            description: 'Commits, PRs, issues, reviews',
                            value: 'github',
                            emoji: '🐙',
                        },
                        {
                            label: 'Attendance',
                            description: 'Meeting attendance records',
                            value: 'attendance',
                            emoji: '✅',
                        },
                        {
                            label: 'Word Count',
                            description: 'Total words said in meetings',
                            value: 'words',
                            emoji: '📝',
                        },
                    ])
            )

            const reply = await interaction.reply({
                content: `📊 **Activity Report Generator**\n\n**Format:** ${fileType.toUpperCase()}\n**Date Range:** ${startDateInput || 'All time'} → ${endDateInput || 'Today'}\n\nPlease select the statistics you want to include:`,
                components: [statsRow],
                flags: MessageFlags.Ephemeral,
                fetchReply: true,
            })

            // Store the configuration
            const { getConfig } = await import('../../interactions/shared/activity_report_config.js')
            const config = getConfig(interaction.user.id, reply.id)
            config.startDate = startDateInput || undefined
            config.endDate = endDateInput || undefined
            config.fileType = fileType
        } catch (err) {
            console.error('Error showing activity report:', err)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Failed to start activity report generation.',
                    flags: MessageFlags.Ephemeral,
                })
            }
        }
    }
)

export default command