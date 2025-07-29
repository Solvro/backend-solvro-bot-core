import { ChannelType, CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import { client } from '#app/discord/index'
import Meeting, { AttendanceStatus } from '#models/meetings'
import Member from '#models/member'
import logger from '@adonisjs/core/services/logger'
import { monitorVoiceState } from '#app/discord/handlers/voiceStateHandler'

const OPTION_CHANNEL = 'channel'
const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('monitor')
    .setDescription('Monitor a voice channel for attendance')
    .addChannelOption((option) =>
      option
        .setName(OPTION_CHANNEL)
        .setDescription('The ID of the voice channel to monitor')
        .setRequired(false)
        .addChannelTypes(ChannelType.GuildVoice)
    ),
  async (interaction: CommandInteraction) => {
    const voiceChannelId = await getVoiceChannelId(interaction)
    if (!voiceChannelId) {
      interaction.reply({
        content: 'Please specify a voice channel or join one to use this command.',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    // get meeting by cannel id
    const meeting = await Meeting.query()
      .orderBy('id', 'desc')
      .where('discord_channel_id', voiceChannelId)
      .first()
    if (!meeting) {
      interaction.reply({
        content: 'No meeting found in this channel',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    // save users currently in vc channel
    const channel = await client.channels.fetch(voiceChannelId)
    if (channel?.isVoiceBased()) {
      channel.members.forEach(async (member) => {
        if (member.user.bot) return
        const memberRecord = await Member.firstOrCreate({
          discordId: member.user.id,
        })
        try {
          await memberRecord.related('meetings').attach([meeting.id])
        } catch (error) {
          logger.error('Error attaching member to meeting:', error)
        }
      })
    }

    meeting.attendanceStatus = AttendanceStatus.MONITORING;
    await meeting.save()

    // register listener
    if (client.listeners('voiceStateUpdate').length === 0) {
      client.on('voiceStateUpdate', monitorVoiceState)
    }

    interaction.reply({
      content: 'Monitoring voice channel for attendance',
      flags: MessageFlags.Ephemeral,
    })
  }
)

async function getVoiceChannelId(interaction: CommandInteraction): Promise<string | null> {
  const optChannel = interaction.options.get(OPTION_CHANNEL, false)?.channel
  if (optChannel) {
    return optChannel.id
  }

  const member = await interaction.guild?.members.fetch(interaction.user.id)
  if (member?.voice.channelId) {
    return member.voice.channelId
  }

  return null
}
export default command
