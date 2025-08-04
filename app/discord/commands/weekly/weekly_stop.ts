import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import Meeting, { AttendanceStatus, RecordingStatus } from '#models/meetings'
import { client } from '#app/discord/index';
import env from '#start/env';
import logger from '@adonisjs/core/services/logger'
import { monitorVoiceState } from '#app/discord/handlers/voiceStateHandler';

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('weekly_stop')
        .setDescription('Stops recording and attendance monitoring'),
    async (interaction: CommandInteraction) => {
        const meeting = await Meeting.query()
            .where('recording_status', RecordingStatus.RECORDING)
            .first()

        if (!meeting) {
            interaction.reply({
                content: '❌ No weekly in progress',
                flags: MessageFlags.Ephemeral,
            })
            return
        }

        // Turn off attendance monitoring
        client.off('voiceStateUpdate', monitorVoiceState)
        meeting.attendanceStatus = AttendanceStatus.FINISHED_MONITORING;

        // Turn off transcription
        meeting.recordingStatus = RecordingStatus.STOPPING
        await meeting.save()

        const response = await fetch(`${env.get('TRANSCRIBER_URL')}/stop`, {
            method: 'POST',
        })

        if (!response.ok) {
            interaction.reply({
                content: '❌ Failed to stop recording',
                flags: MessageFlags.Ephemeral,
            })
            meeting.recordingStatus = RecordingStatus.ERROR
            await meeting.save()

            logger.error("Error stopping recording");
            return
        }

        await interaction.reply({
            content: "✅ Weekly session ended successfully:\n- 🎤 Transcription is being saved and will be available shortly\n- 📋 Attendance tracking is complete\n\nYou can:\n- 📄 View the transcription with `/transcription`\n- 🧠 See the meeting summary with `/meeting_summary`\n- 👥 View attendance with `/show_attendance`"
        });
    }
);

export default command;