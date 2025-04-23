import logger from '@adonisjs/core/services/logger'
import { CacheType, Client, Interaction, MessageFlags, VoiceState } from 'discord.js'
import { DiscordClient } from './index.js'
import Meeting from '#models/meetings'
import Member from '#models/member'

export async function ready(readyClient: Client<true>) {
  logger.info(`Discord bot is ready! Logged in as ${readyClient.user.tag}`)
}

export async function interactionCreate(interaction: Interaction<CacheType>) {
  if (!interaction.isChatInputCommand()) return

  const command = (interaction.client as DiscordClient).commands.get(interaction.commandName)

  if (!command) {
    logger.error(`No command matching ${interaction.commandName} was found.`)
    return
  }

  try {
    await command.execute(interaction)
  } catch (error) {
    logger.error(error)
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      })
    } else {
      await interaction.reply({
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral,
      })
    }
  }
  logger.trace(interaction)
}

export async function monitorVoiceState(oldState: VoiceState, newState: VoiceState): Promise<void> {
  const meeting = await Meeting.findBy({ isMonitored: true, discordChannelId: newState.channelId })
  if (!meeting) return
  if (!newState.member) return
  if (newState.member.user.bot) return
  logger.info(`User ${newState.member.user.username} changed voice state`)

  const member = await Member.firstOrCreate({
    discordId: newState.member.user.id,
  })
  try {
    await member.related('meetings').attach([meeting.id])
  } catch (error) {
    logger.error('Error attaching member to meeting:', error)
  }
}
