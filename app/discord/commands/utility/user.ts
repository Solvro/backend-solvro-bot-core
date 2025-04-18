import { SlashCommand } from '#app/discord/index'
import { CommandInteraction, SlashCommandBuilder } from 'discord.js'

const command: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('user')
    .setDescription('Provides information about the user.'),
  async execute(interaction: CommandInteraction) {
    await interaction.reply(`This command was run by ${interaction.user.username}`)
  },
}

export default command
