import vine from '@vinejs/vine'

export const officeCameraPollValidator = vine.compile(
  vine.object({
    count: vine.number().min(0),
    timestamp: vine.string(),
  })
)

export const officeCameraImageUploadValidator = vine.compile(
  vine.object({
    image: vine.file({ size: '5mb', extnames: ['jpg', 'jpeg', 'png', 'webp'] }),
    timestamp: vine.string(),
  })
)
