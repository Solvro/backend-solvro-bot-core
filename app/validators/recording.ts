import vine from '@vinejs/vine'

export const updateRecordingValidator = vine.compile(
  vine.object({
    transcription: vine.string(),
  })
)
