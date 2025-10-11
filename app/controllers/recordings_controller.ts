import Meeting, { RecordingStatus } from '#models/meetings'
import { updateMeetingValidator } from '#validators/recording'
import type { HttpContext } from '@adonisjs/core/http'
import db from '@adonisjs/lucid/services/db'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import GoogleDriveService from '#services/google_drive_service'
import logger from '@adonisjs/core/services/logger'

export default class RecordingsController {
  async register({ request, params, response }: HttpContext) {
    const schema = vine.object({ id: vine.number() })

    const validator = vine.compile(schema)
    const { id } = await validator.validate(params)
    const payload = await request.validateUsing(updateMeetingValidator)

    const trx = await db.transaction()

    const meeting = await Meeting.find(id)
    if (!meeting) {
      return response.status(404).json({ message: 'Recording not found' })
    }

    meeting.transcription = payload.text
    meeting.recordingStatus = RecordingStatus.COMPLETED
    meeting.finishedAt = DateTime.now()
    await meeting.save()

    try {
      // TODO: save chunks to db
      for (const segment of payload.segments) {
        await meeting
          .useTransaction(trx)
          .related('chunks')
          .create({
            discordUserId: segment.userId,
            startTime: segment.start,
            duration: segment.end - segment.start,
            text: segment.text,
          })
      }

      await trx.commit()
      return response.status(204)
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }

  /**
   * Webhook for when transcriber service completes summary generation
   * At this point, we assume both transcription and summary are ready
   */
  async summary({ request, params, response }: HttpContext) {
    const schema = vine.object({ id: vine.number() })
    const summarySchema = vine.object({
      summary: vine.string().trim(),
    })

    try {
      const validator = vine.compile(schema)
      const { id } = await validator.validate(params)
      
      const summaryValidator = vine.compile(summarySchema)
      const { summary } = await summaryValidator.validate(request.all())

      const meeting = await Meeting.find(id)
      if (!meeting) {
        return response.status(404).json({ message: 'Meeting not found' })
      }

      logger.info(`Received summary webhook for meeting ${id}`)

      // Upload all files to Google Drive now that everything is ready
      const googleDriveService = new GoogleDriveService()
      
      if (await googleDriveService.isConfigured()) {
        try {
          await googleDriveService.uploadAllMeetingFiles(meeting, summary)
          logger.info(`Successfully uploaded files to Google Drive for meeting ${id}`)
        } catch (error) {
          logger.error(`Failed to upload files to Google Drive for meeting ${id}:`, error)
          // don't fail the webhook
        }
      } else {
        logger.warn(`Google Drive not configured, skipping upload for meeting ${id}`)
      }

      return response.status(200).json({ message: 'Summary received and files uploaded' })
    } catch (error) {
      logger.error(`Error processing summary webhook:`, error)
      return response.status(500).json({ message: 'Internal server error' })
    }
  }
}
