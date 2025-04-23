import { ChannelType, CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import { client } from '#app/discord/index'
import { monitorVoiceState } from '#app/discord/event_handlers'
import Meeting from '#models/meetings'

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
    const optCh = interaction.options.get(OPTION_CHANNEL, false)
    let voiceChannelId: string
    if (optCh && optCh.channel) {
      voiceChannelId = optCh.channel.id
    } else {
      const member = await interaction.guild?.members.fetch(interaction.user.id)
      if (!member || !member.voice.channelId) {
        interaction.reply({
          content: 'You must provide voice channel or be in a voice channel to use this command',
          flags: MessageFlags.Ephemeral,
        })
        return
      }
      voiceChannelId = member.voice.channelId
    }

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
    meeting.isMonitored = true
    await meeting.save()
    client.on('voiceStateUpdate', monitorVoiceState)
    interaction.reply({
      content: 'Monitoring voice channel for attendance',
      flags: MessageFlags.Ephemeral,
    })
  }
)

export default command
