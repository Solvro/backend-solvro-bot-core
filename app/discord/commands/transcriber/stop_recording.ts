import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import env from '#start/env'
import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('stop_recording')
    .setDescription('Stop recording and leave the voice channel'),
  async (interaction: CommandInteraction) => {
    const response = await fetch(`${env.get('TRANSCRIBER_URL')}/stop`, {
      method: 'POST',
    })
    if (!response.ok) {
      interaction.reply({
        content: 'Failed to stop recording',
        flags: MessageFlags.Ephemeral,
      })
      return
    }
    interaction.reply({ content: 'Stopped recording' })
  }
)
export default command
