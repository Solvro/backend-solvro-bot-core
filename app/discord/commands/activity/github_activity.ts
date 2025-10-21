import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import GithubActivity from '#models/github_activity'
import Member from '#models/member'

function parseDate(dateString: string): Date | null {
  // Support formats: YYYY-MM-DD
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
  const match = dateString.match(dateRegex)
  
  if (!match) {
    return null
  }

  const [, year, month, day] = match
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return null
  }

  // Check if the parsed values match the input (catches invalid dates like 2025-02-30)
  if (
    date.getFullYear() !== parseInt(year) ||
    date.getMonth() !== parseInt(month) - 1 ||
    date.getDate() !== parseInt(day)
  ) {
    return null
  }

  date.setHours(0, 0, 0, 0)
  return date
}

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('github_activity')
        .setDescription('Show github activity for a specific user in a given date range')
        .addUserOption((option) => 
            option
                .setName('user')
                .setDescription('User to check activity for')
                .setRequired(true)
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
        await interaction.deferReply({ flags: MessageFlags.Ephemeral })

        const userDiscordId = interaction.options.getUser('user')?.id
        const startDateStr = interaction.options.getString('start_date')
        const endDateStr = interaction.options.getString('end_date')

        if (!userDiscordId) {
            await interaction.editReply({ content: '❌ Invalid user specified.' })
            return
        }

        const user = await Member.query()
            .where('discord_id', userDiscordId)
            .first()

        if (!user || !user.githubId) {
            await interaction.editReply({ content: '❌ User not found in the database or has no GitHub ID.' })
            return
        }

        // Parse and validate dates
        let startDate: Date | null = null
        let endDate: Date | null = null

        if (startDateStr) {
            startDate = parseDate(startDateStr)
            if (!startDate) {
                await interaction.editReply({ 
                    content: `❌ Invalid start date format: \`${startDateStr}\`. Please use YYYY-MM-DD format (e.g., 2025-01-15).` 
                })
                return
            }
        }

        if (endDateStr) {
            endDate = parseDate(endDateStr)
            if (!endDate) {
                await interaction.editReply({ 
                    content: `❌ Invalid end date format: \`${endDateStr}\`. Please use YYYY-MM-DD format (e.g., 2025-10-19).` 
                })
                return
            }
        } else {
            // Default end date to end of today
            endDate = new Date()
            endDate.setHours(23, 59, 59, 999)
        }

        // Validate start_date < end_date
        if (startDate && endDate && startDate > endDate) {
            await interaction.editReply({ 
                content: `❌ Start date (\`${startDateStr}\`) must be before or equal to end date (\`${endDateStr}\`).` 
            })
            return
        }

        // Build query
        let query = GithubActivity.query()
            .select('type')
            .where('author_github_id', user.githubId)

        if (startDate) {
            query = query.where('date', '>=', startDate)
        }

        if (endDate) {
            query = query.where('date', '<=', endDate)
        }

        const activity = await query
            .count('github_id as count')
            .groupBy('type')

        // Format period description
        let periodDesc = 'all time'
        if (startDate && endDate) {
            periodDesc = `${startDateStr} to ${endDateStr}`
        } else if (startDate) {
            periodDesc = `since ${startDateStr}`
        } else if (endDateStr) {
            periodDesc = `up to ${endDateStr}`
        }

        let summary = `📊 **${user.firstName} ${user.lastName}** GitHub activity during \`${periodDesc}\`:\n`

        if (activity.length === 0) {
            summary += 'No GitHub activity found.'
        } else {
            for (const row of activity) {
                const type = row.type
                summary += `• **${type}**: ${row.$extras.count}\n`
            }
        }

        await interaction.editReply({ content: summary })
    }
)

export default command
