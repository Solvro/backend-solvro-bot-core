import { SlashCommand, StaticCommand } from '#app/discord/commands/commands'
import { client } from '#app/discord/index'
import Meeting, { RecordingStatus } from '#models/meetings'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import { ChannelType, CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'

const COMMAND_NAME = 'record'
const OPTION_CHANNEL = 'channel'
const OPTION_MEETING_NAME = 'meeting_name'
const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName(COMMAND_NAME)
    .setDescription('Record audio from a voice channel')
    .addChannelOption((option) =>
      option
        .setName(OPTION_CHANNEL)
        .setDescription('The ID of the voice channel to join')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice)
    )
    .addStringOption((option) =>
      option.setName(OPTION_MEETING_NAME).setDescription('Meeting name').setRequired(true)
    ),
  async (interaction: CommandInteraction) => {
    const optCh = interaction.options.get(OPTION_CHANNEL, true)
    if (!optCh.channel) {
      interaction.reply({
        content: 'Invalid channel option',
        flags: MessageFlags.Ephemeral,
      })
      return
    }
    const optMeetingName = interaction.options.get(OPTION_MEETING_NAME, true)
    const channelId = optCh.channel.id
    const guild = await client.guilds.fetch(env.get('DISCORD_GUILD_ID'))
    const channel = await guild.channels.fetch(channelId)

    const meeting = await Meeting.create({
      name: String(optMeetingName.value),
      discordChannelId: channelId,
      recordingStatus: RecordingStatus.PENDING,
    })

    const response = await fetch(`${env.get('TRANSCRIBER_URL')}/start`, {
      method: 'POST',
      body: JSON.stringify({
        channelId: String(channelId),
        meetingId: String(meeting.id),
        meetingName: optMeetingName?.value ?? 'default',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      meeting.recordingStatus = RecordingStatus.ERROR
      await meeting.save()
      interaction.reply({
        content: 'Failed to start recording',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    meeting.recordingStatus = RecordingStatus.RECORDING
    await meeting.save()

    interaction.reply({
      content: `Recording audio from channel: *${channel?.name}*`,
    })
  }
)

export default command
