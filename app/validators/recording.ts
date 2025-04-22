import vine from '@vinejs/vine'

export const updateMeetingValidator = vine.compile(
  vine.object({
    transcription: vine.string(),
    metadata: vine.array(
      vine.object({
        filepath: vine.string(),
        userId: vine.string(),
        globalTimestamp: vine.number(),
        recordingTImestamp: vine.number(),
        duration: vine.number(),
      })
    ),
  })
)
