import type { HttpContext } from '@adonisjs/core/http'
import GithubActivity from '#models/github_activity'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'
import crypto from 'crypto'
import env from '#start/env'
import { githubWebhookValidator } from '#validators/github_webhook'


function isValidHmacSignature(content: string | Buffer, receivedSignature: string, secret: string, algorithm: string = 'sha256'): boolean {
    const hmac = crypto.createHmac(algorithm, secret)
    hmac.update(content)
    const expectedSignature = hmac.digest('hex')

    const received = receivedSignature.replace(/^sha256=/, '')

    return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(received, 'hex')
    )
}

export default class GithubWebhooksController {
    async webhook({ request, response }: HttpContext) {
        const event = request.header('X-GitHub-Event')
        const signature = request.header('X-Hub-Signature-256');

        // validate request with signature
        if (!signature) {
            logger.debug("Github webhook: Missing signature")
            return response.unauthorized('Missing signature')
        }

        const rawBody = request.raw()
        if (!rawBody) {
            logger.debug("Github webhook: Missing request body")
            return response.badRequest('Missing request body')
        }

        const secret = env.get("GITHUB_WEBHOOK_SECRET")
        if (!isValidHmacSignature(rawBody, signature, secret)) {
            logger.debug("Github webhook: Invalid signature")
            return response.unauthorized('Invalid signature')
        }

        // Add debugging BEFORE validation
        const rawPayload = request.body()
        logger.debug("Raw payload before validation:", JSON.stringify(rawPayload))
        logger.debug("Repository in raw payload:", rawPayload?.repository?.full_name)

        // handle event
        const payload = await request.validateUsing(githubWebhookValidator);

        // Add debugging AFTER validation
        logger.debug("Payload after validation:", JSON.stringify(payload))
        logger.debug("Repository after validation:", payload?.repository?.full_name)

        const fullRepoName = payload.repository.full_name

        if (!event || !fullRepoName) {
            logger.debug("Github webhook: Missing event header or repository data.")
            logger.debug("Event:", event)
            logger.debug("Full repo name:", fullRepoName)
            return response.badRequest('Missing event header or repository data.')
        }

        try {
            switch (event) {
                case 'push': {
                    const commits = payload.commits || []
                    const authorId = payload.sender?.id || 'unknown'

                    logger.debug("Github webhook event: " + event + ", user " + authorId + " pushed " + commits.length + " commits");

                    for (const commit of commits) {
                        const githubId = commit.id
                        const message = commit.message
                        const date = commit.timestamp

                        const exists = await GithubActivity.query()
                            .where('githubId', githubId)
                            .where('type', 'commit')
                            .first()

                        if (!exists) {
                            await GithubActivity.create({
                                githubId,
                                type: 'commit',
                                message,
                                authorGithubId: authorId,
                                repo: fullRepoName,
                                date: DateTime.fromISO(date),
                            })
                        }
                    }
                    break
                }

                case 'issues': {
                    const issue = payload.issue || null
                    const action = payload.action || ''

                    if (['opened', 'edited'].includes(action) && issue) {
                        const githubId = issue.node_id
                        const authorId = issue.user?.id?.toString() || 'unknown'
                        const message = issue.title
                        const date = issue.created_at

                        logger.debug("Github webhook event: " + event + ", user " + authorId + " created/edited " + issue.title + " issue");

                        const exists = await GithubActivity.query()
                            .where('githubId', githubId)
                            .where('type', 'issue')
                            .first()

                        if (!exists) {
                            await GithubActivity.create({
                                githubId,
                                type: 'issue',
                                message,
                                authorGithubId: authorId,
                                repo: fullRepoName,
                                date: DateTime.fromISO(date),
                            })
                        }
                    }
                    break
                }

                case 'pull_request': {
                    const pr = payload.pull_request || null
                    const action = payload.action || ''

                    if (['opened', 'reopened', 'edited'].includes(action) && pr) {
                        const githubId = pr.node_id
                        const authorId = pr.user?.id?.toString() || 'unknown'
                        const message = pr.title
                        const date = pr.created_at

                        logger.debug("Github webhook event: " + event + ", user " + authorId + " created/reopened/edited " + pr.title + " pull request");

                        const exists = await GithubActivity.query()
                            .where('githubId', githubId)
                            .where('type', 'pr')
                            .first()

                        if (!exists) {
                            await GithubActivity.create({
                                githubId,
                                type: 'pr',
                                message,
                                authorGithubId: authorId,
                                repo: fullRepoName,
                                date: DateTime.fromISO(date),
                            })
                        }
                    }
                    break
                }

                case 'pull_request_review': {
                    const review = payload.review || null
                    if (!review) break;

                    const githubId = review.node_id
                    const authorId = review.user?.id?.toString() || 'unknown'
                    const message = `Review state: ${review.state}`
                    const date = review.submitted_at

                    logger.debug("Github webhook event: " + event + ", user " + authorId + " reviewed a pull request");

                    const exists = await GithubActivity.query()
                        .where('githubId', githubId)
                        .where('type', 'review')
                        .first()

                    if (!exists) {
                        await GithubActivity.create({
                            githubId,
                            type: 'review',
                            message,
                            authorGithubId: authorId,
                            repo: fullRepoName,
                            date: DateTime.fromISO(date),
                        })
                    }
                    break
                }

                default:
                    logger.info("Unsupported github webhook event recieved: " + event);
                    break
            }

            return response.ok('Webhook processed.')
        } catch (error) {
            logger.error(error)
            return response.internalServerError('Error processing GitHub webhook.')
        }
    }
}
