import logger from '@adonisjs/core/services/logger'
import { VoiceState } from 'discord.js'
import Meeting, { AttendanceStatus } from '#models/meetings'
import Member from '#models/member'

export async function monitorVoiceState(
  _oldState: VoiceState,
  newState: VoiceState
): Promise<void> {
  logger.debug(`monitorVoiceState ${JSON.stringify(newState, null, 2)}`)
  if (!newState.member || !newState.channelId) return
  if (newState.member.user.bot) return

  const meeting = await Meeting.query()
    .where('attendance_status', AttendanceStatus.MONITORING)
    .andWhere('discord_channel_id', newState.channelId)
    .orderBy('created_at', 'desc') // Get the *latest* matching meeting
    .first()
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
