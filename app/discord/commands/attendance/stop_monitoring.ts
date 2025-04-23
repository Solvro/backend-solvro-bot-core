import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import { client } from '#app/discord/index'
import { monitorVoiceState } from '#app/discord/event_handlers'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('stop_monitoring')
    .setDescription('Stop monitoring a voice channel for attendance'),
  async (interaction: CommandInteraction) => {
    client.off('voiceStateUpdate', monitorVoiceState)
    interaction.reply({
      content: 'Stopped monitoring voice channel for attendance',
      flags: MessageFlags.Ephemeral,
    })
  }
)

export default command
