import { ChannelType, ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import Meeting, { AttendanceStatus, RecordingStatus } from '#models/meetings'
import { client } from '#app/discord/index';
import env from '#start/env';
import Member from '#models/member';
import logger from '@adonisjs/core/services/logger'
import { monitorVoiceState } from '#app/discord/handlers/voiceStateHandler';

const command: SlashCommand = new StaticCommand(
    new SlashCommandBuilder()
        .setName('weekly_start')
        .setDescription('Creates a meeting, starts voice recording and attendance monitoring on a given channel')
        .addStringOption((option) =>
            option.setName('meeting_name').setDescription('Meeting name').setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('The ID of the voice channel')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
        ),
    async (interaction: ChatInputCommandInteraction) => {
        await interaction.deferReply({})

        const optCh = interaction.options.get('channel', true)
        if (!optCh.channel) {
            interaction.editReply({
                content: '❌ Invalid channel option',
            })
            return
        }
        const guild = interaction.guild ?? (await client.guilds.fetch(env.get('DISCORD_GUILD_ID')))
        const optMeetingName = interaction.options.get('meeting_name', true)
        const channelId = optCh.channel.id
        const channel = await guild.channels.fetch(channelId)

        if (!channel || !channel.isVoiceBased()) {
            interaction.editReply({
                content: '❌ Invalid channel option',
            })
            return
        }

        // Check if there's an ongoing meeting
        const ongoingMeeting = await Meeting.query()
            .where('recording_status', RecordingStatus.RECORDING)
            .first()

        if (ongoingMeeting) {
            interaction.editReply({
                content: '❌ There is already an ongoing weekly meeting. Please stop it before starting a new one.',
            })
            return
        }

        const newMeeting = await Meeting.create({
            name: String(optMeetingName.value),
            discordChannelId: channel.id,
            recordingStatus: RecordingStatus.PENDING,
            attendanceStatus: AttendanceStatus.NOT_MONITORED,
        });

        // Send request to start transcription
        const response = await fetch(`${env.get('TRANSCRIBER_URL')}/start`, {
            method: 'POST',
            body: JSON.stringify({
                channelId: String(channel.id),
                meetingId: String(newMeeting.id),
                meetingName: optMeetingName?.value ?? 'default',
            }),
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (!response.ok) {
            newMeeting.recordingStatus = RecordingStatus.ERROR
            await newMeeting.save()

            logger.error("Error starting recording");
            interaction.editReply({
                content: '❌ Failed to start recording',
            })
            return
        }

        newMeeting.recordingStatus = RecordingStatus.RECORDING
        await newMeeting.save()

        // save users currently in vc channel
        channel.members.forEach(async (member) => {
            if (member.user.bot) return

            const memberRecord = await Member.firstOrCreate({
                discordId: member.user.id,
            })

            try {
                await memberRecord.related('meetings').attach([newMeeting.id])
            } catch (error) {
                logger.error('Error attaching member to meeting:', error)
            }
        })

        newMeeting.attendanceStatus = AttendanceStatus.MONITORING;
        await newMeeting.save()

        // register listener
        if (client.listeners('voiceStateUpdate').length === 0) {
            client.on('voiceStateUpdate', monitorVoiceState)
        }

        await interaction.editReply({
            content: "✅ Weekly session started successfully:\n- 🎤 Transcription is now active\n- 📋 Attendance tracking is in progress"
        });
    }
);

export default command;