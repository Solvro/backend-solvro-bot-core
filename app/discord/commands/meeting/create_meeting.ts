import { ChannelType, CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'
import { SlashCommand, StaticCommand } from '../commands.js'
import Meeting from '#models/meetings'

const command: SlashCommand = new StaticCommand(
  new SlashCommandBuilder()
    .setName('create_meeting')
    .setDescription('Create a meeting')
    .addStringOption((option) =>
      option.setName('meeting_name').setDescription('Meeting name').setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The ID of the voice channel to join')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice)
    ),
  async (interaction: CommandInteraction) => {
    const optCh = interaction.options.get('channel', true)
    if (!optCh.channel) {
      interaction.reply({
        content: 'Invalid channel option',
        flags: MessageFlags.Ephemeral,
      })
      return
    }
    const optMeetingName = interaction.options.get('meeting_name', true)
    const channelId = optCh.channel.id
    await Meeting.create({
      name: String(optMeetingName.value),
      discordChannelId: channelId,
      recordingStatus: null,
    })
    interaction.reply({
      content: `Meeting ${optMeetingName.value} created in channel ${optCh.channel.name}`,
      flags: MessageFlags.Ephemeral,
    })
  }
)

export default command
