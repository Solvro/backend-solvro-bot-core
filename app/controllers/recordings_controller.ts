import Recording, { RecordingStatus } from '#models/recording'
import { updateRecordingValidator } from '#validators/recording'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'

export default class RecordingsController {
  async register({ request, params, response }: HttpContext) {
    const schema = vine.object({ id: vine.number() })
    const validator = await vine.compile(schema)
    const { id } = await validator.validate(params)
    const payload = await request.validateUsing(updateRecordingValidator)

    const recording = await Recording.find(id)
    if (!recording) {
      return response.status(404).json({ message: 'Recording not found' })
    }

    recording.transcription = payload.transcription
    recording.status = RecordingStatus.COMPLETED
    await recording.save()

    return response.status(204)
  }
}
