import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import GithubActivity from '#models/github_activity'
import Member from '#models/member';

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
        ).addUserOption((option) => 
            option.setName('user').setDescription('User').setRequired(true)
        ),
    async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const period = interaction.options.get('time_period')?.value as string
        const userDiscordId = interaction.options.getUser('user')?.id;

        if (!period || !userDiscordId) {
            await interaction.editReply({ content: 'Invalid command input' })
            return
        }

        const user = await Member.query()
            .where('discord_id', userDiscordId)
            .first();

        if (!user || !user.githubId) {
            await interaction.editReply({ content: 'User not found in the database or has no GitHub ID.' });
            return;
        }

        const startDate = getStartDateFromPeriod(period)

        const activity = await GithubActivity.query()
            .select('type')
            .where('author_github_id', user.githubId)
            .where('date', '>=', startDate)
            .count('github_id as count')
            .groupBy('type')

        let summary = `📊 **${user.firstName} ${user.lastName}** GitHub activity during \`${period}\`:\n`

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
