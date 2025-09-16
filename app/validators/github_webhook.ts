import vine from '@vinejs/vine'

export const githubWebhookValidator = vine.compile(
    vine.object({
        repository: vine.object({
            full_name: vine.string(),
        }),
        sender: vine.object({
            id: vine.string(),
            login: vine.string(),
        }),
        commits: vine.array(
            vine.object({
                id: vine.string(),
                message: vine.string(),
                timestamp: vine.string(),
            })
        ).optional(),
        issue: vine.object({
            node_id: vine.string(),
            title: vine.string(),
            user: vine.object({
                id: vine.string(),
                login: vine.string(),
            }),
            created_at: vine.string(),
        }).optional(),
        action: vine.string().optional(),
        pull_request: vine.object({
            node_id: vine.string(),
            title: vine.string(),
            user: vine.object({
                id: vine.string(),
                login: vine.string(),
            }),
            created_at: vine.string(),
        }).optional(),
        review: vine.object({
            node_id: vine.string(),
            body: vine.string().nullable(),
            state: vine.string(),
            user: vine.object({
                id: vine.string(),
                login: vine.string(),
            }),
            submitted_at: vine.string(),
        }).optional(),
    })
)