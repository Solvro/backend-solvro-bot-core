import {
  CommandInteraction,
  ChannelType,
  SlashCommandBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js'
import { StaticCommand } from '../commands.js'

const command = new StaticCommand(
  new SlashCommandBuilder()
    .setName('archive')
    .setDescription('Archive channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async (interaction: CommandInteraction): Promise<void> => {
    const channel = interaction.channel
    const guild = interaction.guild

    if (!guild || !channel || !channel.isTextBased()) return;

    // Make sure it's a GuildChannel and has setParent
    if (!('setParent' in channel)) {
      await interaction.reply({ content: 'This command can only be used in guild channels.', ephemeral: true });
      return;
    }

    const archivedCategory = guild.channels.cache.find(
      (ch) =>
        ch.type === ChannelType.GuildCategory &&
        ch.name.toLowerCase() === 'archived'
    )

    if (!archivedCategory) {
      await interaction.reply({ content: 'Category "ARCHIVED" not found.', ephemeral: true })
      return
    }

    try {
      await (channel as TextChannel).setParent(archivedCategory.id)
      await interaction.reply({ content: 'Channel archived successfully.', ephemeral: true })
    } catch (error) {
      console.error(error)
      await interaction.reply({ content: 'Failed to archive the channel.', ephemeral: true })
    }
  }
)

export default command
