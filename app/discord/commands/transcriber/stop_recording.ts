import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import Meeting from '#models/meetings'
import { RecordingStatus } from '#models/meetings'
import env from '#start/env'
import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('stop_recording')
    .setDescription('Stop recording and leave the voice channel'),
  async (interaction: CommandInteraction) => {
    const meeting = await Meeting.query()
      .where('recording_status', RecordingStatus.RECORDING)
      .first()
    if (!meeting) {
      interaction.reply({
        content: 'No recording in progress',
        flags: MessageFlags.Ephemeral,
      })
      return
    }
    meeting.recordingStatus = RecordingStatus.STOPPING
    await meeting.save()
    const response = await fetch(`${env.get('TRANSCRIBER_URL')}/stop`, {
      method: 'POST',
    })
    if (!response.ok) {
      interaction.reply({
        content: 'Failed to stop recording',
        flags: MessageFlags.Ephemeral,
      })
      meeting.recordingStatus = RecordingStatus.ERROR
      await meeting.save()
      return
    }

    interaction.reply({ content: 'Stopped recording' })
  }
)
export default command
