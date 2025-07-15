import env from '#start/env'
import logger from '@adonisjs/core/services/logger'
import {Client, GuildMember,} from 'discord.js'


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
