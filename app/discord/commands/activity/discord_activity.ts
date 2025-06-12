import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import DiscordActivity from '#models/discord_activity'

function getStartDateFromPeriod(period: string): Date {
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
    .setName('discord_activity')
    .setDescription('Show discord activity for a specyfic user and a given time period')
    .addStringOption((option) =>
      option
        .setName('time_period')
        .setDescription('Time period to count from')
        .setRequired(true)
        .setChoices(
          { name: 'Today', value: 'today' },
          { name: 'Last Week', value: 'last_week' },
          { name: 'Last Month', value: 'last_month' },
          { name: 'This Semester', value: 'this_semester' }
        )
    )
    .addUserOption((option) => option.setName('user').setDescription('User').setRequired(true)),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const period = interaction.options.get('time_period')?.value as string
    const user = interaction.options.get('user')?.user
    const member = interaction.guild?.members.cache.get(user?.id || '')

    if (!period || !user || !member) {
      await interaction.editReply({ content: 'Invalid command input' })
      return
    }

    const startDate = getStartDateFromPeriod(period)

    const activity = await DiscordActivity.query()
      .where('discord_id', user.id)
      .where('date', '>=', startDate)
      .sum('message_count as count')

    const messageCount = activity[0]?.$extras.count || 0
    const displayName = member.nickname || user.username

    const capitalizedPeriod = period.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

    await interaction.editReply({
      content: `📊 **${displayName}** sent **${messageCount} messages** during \`${capitalizedPeriod}\`.`,
    })
  }
)

export default command
