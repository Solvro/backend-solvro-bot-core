import { CommandInteraction, SlashCommandBuilder } from 'discord.js'
import { StaticCommand } from '../commands.js'
import ChannelActivity from '#models/channel_activity'

function getSince(range: 'week' | 'month' | '6months'): Date {
  const now = new Date()
  const since = new Date(now)
  switch (range) {
    case 'week':
      since.setDate(now.getDate() - 7)
      break
    case 'month':
      since.setMonth(now.getMonth() - 1)
      break
    case '6months':
      since.setMonth(now.getMonth() - 6)
      break
  }
  return since
}

const command = new StaticCommand(
  new SlashCommandBuilder()
    .setName('channel_activity')
    .setDescription('Wyświetla 10 najbardziej aktywnych kanałów na serwerze')
    .addStringOption(opt =>
      opt
        .setName('interval')
        .setDescription('Time interval: week / month / 6 months (nothing = whole time)')
        .addChoices(
          { name: 'Week', value: 'week' },
          { name: 'Month', value: 'month' },
          { name: '6 Months', value: '6months' },
        )
        .setRequired(false)
    ),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ ephemeral: true })

    // UWAGA: getString zwraca string | null, nie obiekt z .value
    const range = interaction.options.getString('interval') as 'week' | 'month' | '6months' | null

    let query = ChannelActivity.query()

    if (range) {
      const since = getSince(range)
      query = query.where('created_at', '>=', since)
    }

    const channels = await query
      .orderBy('message_count', 'desc')
      .limit(10)

    if (channels.length === 0) {
      await interaction.editReply({ content: 'Brak danych o aktywności kanałów dla wybranego przedziału.' })
      return
    }

    const lines = await Promise.all(
      channels.map(async (c, idx) => {
        try {
          const channel = await interaction.guild?.channels.fetch(c.channelId)
          return `${idx + 1}. ${channel ? `<#${c.channelId}>` : `ID: ${c.channelId}`} — ${c.messageCount} wiadomości`
        } catch {
          return `${idx + 1}. ID: ${c.channelId} — ${c.messageCount} wiadomości`
        }
      })
    )

    const label = range
      ? range === 'week' ? 'ostatni tydzień'
        : range === '6months' ? 'ostatnie 6 miesięcy'
          : 'ostatni miesiąc'
      : 'cały czas'

    await interaction.editReply({
      content: `**Najaktywniejsze kanały (${label}):**\n${lines.join('\n')}`,
    })
  }
)

export default command
