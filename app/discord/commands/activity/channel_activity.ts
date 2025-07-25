import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { StaticCommand } from '../commands.js'
import ChannelActivity from '#models/channel_activity'

// ZMIANA: przekazujemy tu TYLKO SlashCommandBuilder (nie SharedSlashCommand!)
const command = new StaticCommand(
  new SlashCommandBuilder()
    .setName('channel_activity')
    .setDescription('Wyświetla 10 najbardziej aktywnych kanałów na serwerze'),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })

    const channels = await ChannelActivity.query()
      .orderBy('message_count', 'desc')
      .limit(10)

    if (channels.length === 0) {
      await interaction.editReply({ content: 'Brak danych o aktywności kanałów.' })
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

    await interaction.editReply({
      content: `**Najaktywniejsze kanały:**\n${lines.join('\n')}`,
    })
  }
)

export default command
