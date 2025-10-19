import {
    ChatInputCommandInteraction,
    ActionRowBuilder,
    SlashCommandBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    MessageFlags,
} from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('activity_report')
        .setDescription('Configure and generate an activity report with flexible options')
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

            // Create an embed to display the current configuration
            const embed = new EmbedBuilder()
                .setColor(0x0099ff)
                .setTitle('📊 Activity Report Configuration')
                .setDescription('Configure your activity report using the options below.')
                .addFields(
                    { 
                        name: '📅 Start Date', 
                        value: startDateInput ? `\`${startDateInput}\`` : '`Not set (all time)`', 
                        inline: true 
                    },
                    { 
                        name: '📅 End Date', 
                        value: endDateInput ? `\`${endDateInput}\`` : '`Not set (today)`', 
                        inline: true 
                    },
                    { name: '📈 Stats to Include', value: '`None selected`', inline: false },
                    { name: '📄 Export Format', value: '`Not selected`', inline: true }
                )
                .setFooter({ text: 'Select options below, then click Generate Report' })
                .setTimestamp()

            // Row 1: Stats selection (multi-select menu)
            const statsRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('activity_report_stats_select')
                    .setPlaceholder('Select stats to include')
                    .setMinValues(0)
                    .setMaxValues(4)
                    .addOptions([
                        {
                            label: 'Discord Activity',
                            description: 'Message counts and activity',
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
                            description: 'Transcription word counts',
                            value: 'words',
                            emoji: '📝',
                        },
                    ])
            )

            // Row 2: File type selection
            const fileTypeRow = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('activity_report_file_type_select')
                    .setPlaceholder('Select export format')
                    .addOptions([
                        {
                            label: 'CSV',
                            description: 'Comma-separated values (Excel compatible)',
                            value: 'csv',
                            emoji: '📄',
                        },
                        {
                            label: 'Excel',
                            description: 'Microsoft Excel format (.xlsx)',
                            value: 'excel',
                            emoji: '📊',
                        },
                    ])
            )

            // Row 3: Submit button
            const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
                new ButtonBuilder()
                    .setCustomId('activity_report_submit')
                    .setLabel('Generate Report')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('✨'),
                new ButtonBuilder()
                    .setCustomId('activity_report_cancel')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            )

            const reply = await interaction.reply({
                embeds: [embed],
                components: [statsRow, fileTypeRow, actionRow],
                flags: MessageFlags.Ephemeral,
                fetchReply: true,
            })

            // Store the dates in the config after the message is created
            const { getConfig } = await import('../../interactions/shared/activity_report_config.js')
            const config = getConfig(interaction.user.id, reply.id)
            config.startDate = startDateInput || undefined
            config.endDate = endDateInput || undefined
        } catch (err) {
            console.error('Error showing activity report:', err)
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ Failed to open activity report configuration.',
                    flags: MessageFlags.Ephemeral,
                })
            }
        }
    }
)

export default command