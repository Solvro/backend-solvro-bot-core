import vine from '@vinejs/vine'

export const officeCameraPollValidator = vine.compile(
  vine.object({
    count: vine.number().min(0),
    file: vine.file({ size: '5mb', extnames: ['jpg', 'jpeg'] }).optional(),
    timestamp: vine.date({
      formats: ['iso8601'],
    }),
  })
)
