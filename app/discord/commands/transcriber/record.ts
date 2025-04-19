import { DynamicCommand, SlashCommand } from '#app/discord/commands/commands'
import { client } from '#app/discord/index'
import env from '#start/env'
import { CommandInteraction, MessageFlags, SlashCommandBuilder } from 'discord.js'

const COMMAND_NAME = 'record'
const OPTION_CHANNEL = 'channel'
const command: SlashCommand = new DynamicCommand(
  COMMAND_NAME,
  async () => {
    try {
      const guild = await client.guilds.fetch(env.get('DISCORD_GUILD_ID'))
      const channels = await guild.channels.fetch()
      const voiceChannels = channels.filter(
        (channel): channel is NonNullable<typeof channel> =>
          channel !== null && channel.isVoiceBased()
      )
      const choices = voiceChannels.map((channel) => ({ name: channel.name, value: channel.id }))
      console.log(voiceChannels)
      return new SlashCommandBuilder()
        .setName(COMMAND_NAME)
        .setDescription('Record audio from a voice channel')
        .addStringOption((option) =>
          option
            .setName(OPTION_CHANNEL)
            .setDescription('The ID of the voice channel to join')
            .setRequired(true)
            .addChoices(choices)
        )
    } catch (error) {
      throw new Error('Failed to fetch voice channels', error)
    } finally {
      client.destroy()
      await client.destroy()
    }
  },
  async (interaction: CommandInteraction) => {
    const channelId = interaction.options.get(OPTION_CHANNEL, true)
    const guild = await client.guilds.fetch(env.get('DISCORD_GUILD_ID'))
    const channel = await guild.channels.fetch(channelId.value as string)

    const response = await fetch(`http://localhost:3000/start`, {
      method: 'POST',
      body: JSON.stringify({ channelId: String(channelId.value) }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    if (!response.ok) {
      interaction.reply({
        content: 'Failed to start recording',
        flags: MessageFlags.Ephemeral,
      })
      return
    }

    interaction.reply({
      content: `Recording audio from channel: *${channel?.name}*`,
    })
  }
)

export default command
