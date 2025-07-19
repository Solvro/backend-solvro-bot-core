import type { HttpContext } from '@adonisjs/core/http'
import GithubActivity from '#models/github_activity'
import logger from '@adonisjs/core/services/logger'
import { DateTime } from 'luxon'

export default class GithubWebhooksController {
    async webhook({ request, response }: HttpContext) {
        const event = request.header('X-GitHub-Event')
        const payload = request.body()
        const fullRepoName = payload?.repository?.full_name

        console.log(payload)

        if (!event || !fullRepoName) {
            return response.badRequest('Missing event header or repository data.')
        }

        try {
            switch (event) {
                case 'push': {
                    const commits = payload.commits || []
                    for (const commit of commits) {
                        const githubId = commit.id
                        const authorId = commit.author?.id || 'unknown'
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
                    const issue = payload.issue
                    const action = payload.action

                    if (['opened', 'edited'].includes(action)) {
                        const githubId = issue.node_id
                        const authorId = issue.user?.id?.toString() || 'unknown'
                        const message = issue.title
                        const date = issue.created_at

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
                    const pr = payload.pull_request
                    const action = payload.action

                    if (['opened', 'reopened', 'edited'].includes(action)) {
                        const githubId = pr.node_id
                        const authorId = pr.user?.id?.toString() || 'unknown'
                        const message = pr.title
                        const date = pr.created_at

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
                    const review = payload.review
                    const pr = payload.pull_request
                    const githubId = review.node_id
                    const authorId = review.user?.id?.toString() || 'unknown'
                    const message = `Review state: ${review.state}`
                    const date = review.submitted_at

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
                    // ignore other evnt types
                    break
            }

            return response.ok('Webhook processed.')
        } catch (error) {
            logger.error(error)
            return response.internalServerError('Error processing GitHub webhook.')
        }
    }
}
