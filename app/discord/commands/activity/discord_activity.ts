import { ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import DiscordActivity from '#models/discord_activity'

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
    .setName('discord_activity')
    .setDescription('Show discord activity for a specific user in a given date range')
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

    const user = interaction.options.get('user')?.user
    const member = interaction.guild?.members.cache.get(user?.id || '')
    const startDateStr = interaction.options.getString('start_date')
    const endDateStr = interaction.options.getString('end_date')

    if (!user || !member) {
      await interaction.editReply({ content: '❌ Invalid user specified.' })
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
    let query = DiscordActivity.query().where('discord_id', user.id)

    if (startDate) {
      query = query.where('date', '>=', startDate)
    }

    if (endDate) {
      query = query.where('date', '<=', endDate)
    }

    const activity = await query
      .sum('message_count as sum_count')
      .avg('message_count as avg_count')
      .max('message_count as max_count')

    const messageCount = activity[0]?.$extras.sum_count || 0
    const displayName = member.nickname || user.username

    // Format period description
    let periodDesc = 'all time'
    if (startDate && endDate) {
      periodDesc = `${startDateStr} to ${endDateStr}`
    } else if (startDate) {
      periodDesc = `since ${startDateStr}`
    } else if (endDateStr) {
      periodDesc = `up to ${endDateStr}`
    }

    // Calculate number of days
    const daysDiff = startDate && endDate 
      ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : null

    let extraStats = ''
    if (daysDiff && daysDiff > 1) {
      const avgPerDay = Number(activity[0]?.$extras.avg_count) || 0
      const maxPerDay = activity[0]?.$extras.max_count || 0
      extraStats = `\n🗓️ Avg per day: **${avgPerDay.toFixed(1)}**, Max in a day: **${maxPerDay}**`
    }

    await interaction.editReply({
      content: `📊 **${displayName}** sent **${messageCount} messages** during \`${periodDesc}\`.${extraStats}`,
    })
  }
)

export default command
