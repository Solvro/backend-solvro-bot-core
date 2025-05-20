import vine from '@vinejs/vine'

const datetimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{6}\+\d{2}:\d{2}$/

export const officeCameraPollValidator = vine.compile(
  vine.object({
    count: vine.number().min(0),
    file: vine.file({ size: '5mb', extnames: ['jpg', 'jpeg', 'png', 'webp'] }).optional(),
    timestamp: vine.string().regex(datetimeRegex),
  })
)
