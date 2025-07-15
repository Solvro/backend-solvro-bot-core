import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import {CacheType, Client, GuildMember, Interaction, MessageFlags, VoiceState} from 'discord.js'
import { DiscordClient } from './index.js'
import Meeting from '#models/meetings'
import Member from '#models/member'

export async function guildMemberAdd(member: GuildMember) {
  const roleId = env.get('ROLE_ID')

  try {
    const role = member.guild.roles.cache.get(roleId)
    if (!role) {
      logger.info('Role not found')
      return
    }
    await member.roles.add(role)
    logger.info(`Role added successfully.`);
  } catch (error) {
    logger.error('Error while adding role');
  }
}


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

export async function monitorVoiceState(
  _oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  logger.debug(`monitorVoiceState ${JSON.stringify(newState, null, 2)}`)
  if (!newState.member) return
  if (newState.member.user.bot) return
  const meeting = await Meeting.findBy({ isMonitored: true, discordChannelId: newState.channelId })
  if (!meeting) return
  logger.trace(`Monitoring meeting ${meeting.name}`)
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
