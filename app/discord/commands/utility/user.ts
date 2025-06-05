import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { StaticCommand } from '#app/discord/commands/commands'

const command: StaticCommand = new StaticCommand(
  new SlashCommandBuilder().setName('user').setDescription('Get user info'),
  async (interaction: CommandInteraction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral })
    const user = interaction.user
    const member = interaction.member
    const guild = interaction.guild

    await interaction.editReply({
      content: `User: ${user.username} (${user.id})\nMember: ${member}\nGuild: ${guild?.name}`,
    })
  }
)

export default command
