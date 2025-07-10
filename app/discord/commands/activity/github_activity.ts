import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import GithubActivity from '#models/github_activity'

function getStartDateFromPeriod(period: string): Date {
    if (period == "all") return new Date(0);

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()

    const start = new Date()

    switch (period) {
        case 'today':
            start.setHours(0, 0, 0, 0)
            break

        case 'last_week':
            start.setDate(now.getDate() - 7)
            start.setHours(0, 0, 0, 0)
            break

        case 'last_month':
            start.setMonth(month - 1)
            start.setHours(0, 0, 0, 0)
            break

        case 'this_semester':
            if (month >= 2 && month < 9) {
                // March (2) to September (8)
                start.setFullYear(year, 2, 1) // March 1st
            } else {
                // October (9) to February (1)
                const startYear = month >= 9 ? year : year - 1
                start.setFullYear(startYear, 9, 1) // October 1st
            }
            start.setHours(0, 0, 0, 0)
            break

        default:
            throw new Error(`Unsupported period: ${period}`)
    }

    return start
}

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('github_activity')
        .setDescription('Show github activity for a specific user and a given time period')
        .addStringOption((option) =>
            option
                .setName('time_period')
                .setDescription('Time period to count from')
                .setRequired(true)
                .setChoices(
                    { name: 'Today', value: 'today' },
                    { name: 'Past Week', value: 'last_week' },
                    { name: 'Past Month', value: 'last_month' },
                    { name: 'This Semester', value: 'this_semester' },
                    { name: 'All', value: 'all' }
                )
        )
        .addStringOption((option) =>
            option
                .setName('user')
                .setDescription('Github User ID')
                .setRequired(true)
        ),
    async (interaction: CommandInteraction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const period = interaction.options.get('time_period')?.value as string
        const user = interaction.options.get('user')?.value as string;
        // const member = interaction.guild?.members.cache.get(user?.id || '')

        if (!period || !user) {
            await interaction.editReply({ content: 'Invalid command input' })
            return
        }

        const startDate = getStartDateFromPeriod(period)

        const activity = await GithubActivity.query()
            .select('type')
            .where('author_github_id', user)
            .where('date', '>=', startDate)
            .count('github_id as count')
            .groupBy('type')

        // console.log(activity);

        let summary = `📊 **${user}** GitHub activity during \`${period}\`:\n`

        if (activity.length === 0) {
            summary += 'No GitHub activity found.'
        } else {
            for (const row of activity) {
                const type = row.type
                summary += `• **${type}**: ${row.$extras.count}\n`
            }
        }

        await interaction.editReply({ content: summary });

    }
)

export default command
