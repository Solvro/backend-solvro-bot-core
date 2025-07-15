import { CommandInteraction, ChannelType, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js'
import { StaticCommand } from '../commands.js'

const command = new StaticCommand(
  new SlashCommandBuilder()
    .setName('archive')
    .setDescription('Archive channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async (interaction: CommandInteraction): Promise<void> => {
    const channel = interaction.channel
    const guild = interaction.guild

    const archivedCategory = guild.channels.cache.find(
      (ch) => ch.type === ChannelType.GuildCategory && ch.name.toLowerCase() === 'archived'
    )

    if (!archivedCategory) {
      await interaction.reply({ content: 'Category "ARCHIVED" not found.', ephemeral: true })
      return
    }

    try {
      await channel.setParent(archivedCategory.id)
      await interaction.reply({ content: 'Channel archived successfully.', ephemeral: true })
    } catch (error) {
      console.error(error)
      await interaction.reply({ content: 'Failed to archive_channel channel.', ephemeral: true })
    }
  }
)

export default command
