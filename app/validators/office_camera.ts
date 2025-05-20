import vine from '@vinejs/vine'

export const officeCameraPollValidator = vine.compile(
    vine.object({
        count: vine.number().min(0),
        timestamp: vine.string(),
    })
);