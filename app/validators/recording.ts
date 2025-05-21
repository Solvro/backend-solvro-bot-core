import vine from '@vinejs/vine'

// TODO: change this
export const updateMeetingValidator = vine.compile(
  vine.object({
    text: vine.string(),
    task: vine.string(),
    language: vine.string(),
    duration: vine.number(),

    segments: vine.array(
      vine.object({
        id: vine.number(),
        seek: vine.number(),
        start: vine.number(),
        end: vine.number(),
        text: vine.string(),
        tokens: vine.array(vine.number()),
        temperature: vine.number(),
        avg_logprob: vine.number(),
        compression_ratio: vine.number(),
        no_speech_prob: vine.number(),
        userId: vine.string().optional(),
      })
    ),
  })
)
