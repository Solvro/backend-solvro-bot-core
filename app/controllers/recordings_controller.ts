import Meeting, { RecordingStatus } from '#models/meetings'
import { updateMeetingValidator } from '#validators/recording'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime, Duration } from 'luxon'

export default class RecordingsController {
  async register({ request, params, response }: HttpContext) {
    const schema = vine.object({ id: vine.number() })
    const validator = await vine.compile(schema)
    const { id } = await validator.validate(params)
    const payload = await request.validateUsing(updateMeetingValidator)

    const trx = await db.transaction()
    try {
      const meeting = await Meeting.find(id)
      if (!meeting) {
        return response.status(404).json({ message: 'Recording not found' })
      }

      meeting.transcription = payload.transcription
      meeting.recordingStatus = RecordingStatus.COMPLETED
      meeting.finishedAt = DateTime.now()
      await meeting.useTransaction(trx).save()

      for (const chunk of payload.metadata) {
        await meeting
          .useTransaction(trx)
          .related('chunks')
          .create({
            discordUserId: chunk.userId,
            recordedAt: DateTime.fromMillis(chunk.globalTimestamp),
            recordingTimestamp: DateTime.fromMillis(chunk.recordingTImestamp),
            duration: Duration.fromMillis(chunk.duration),
          })
      }

      await trx.commit()
      return response.status(204)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
