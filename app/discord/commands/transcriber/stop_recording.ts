import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Recording, { RecordingStatus } from '#models/recording'
import env from '#start/env'
import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('stop_recording')
    .setDescription('Stop recording and leave the voice channel'),
  async (interaction: CommandInteraction) => {
    const recording = await Recording.query().where('status', RecordingStatus.RECORDING).first()
    if (!recording) {
      interaction.reply({
        content: 'No recording in progress',
        flags: MessageFlags.Ephemeral,
      })
      return
    }
    const response = await fetch(`${env.get('TRANSCRIBER_URL')}/stop`, {
      method: 'POST',
    })
    if (!response.ok) {
      interaction.reply({
        content: 'Failed to stop recording',
        flags: MessageFlags.Ephemeral,
      })
      console.log(recording?.id)
      recording.status = RecordingStatus.ERROR
      await recording.save()
      return
    }

    recording.status = RecordingStatus.STOPPING
    await recording.save()

    interaction.reply({ content: 'Stopped recording' })
  }
)
export default command
