import { args, BaseCommand } from '@adonisjs/core/ace'
import axios from 'axios'
import GithubActivity from '#models/github_activity'
import { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import { DateTime } from 'luxon'

export default class GetGithubActivity extends BaseCommand {
    public static commandName = 'github:activity'
    public static description = 'Sync commits, PRs, and issues for a given GitHub repo URL'

    @args.string()
    declare url: string

    static options: CommandOptions = {
        startApp: true,
    };

    public async run() {
        const repoUrl = this.url;

        const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
        if (!match) {
            this.logger.error('❌ Invalid GitHub repo URL format.')
            return
        }

        const [_, owner, repo] = match
        const fullRepoName = `${owner}/${repo}`
        this.logger.info(`🔍 Syncing GitHub activity for: ${fullRepoName}`)

        let headers;
        if (env.get('GITHUB_TOKEN')) {
            headers = {
                Authorization: `Bearer ${env.get('GITHUB_TOKEN')}`,
                Accept: 'application/vnd.github+json',
            }
        } else {
            headers = {
                Accept: 'application/vnd.github+json',
            };
        }

        const seenCommitIds = new Set<string>()
        let totalCommits = 0
        let newCommits = 0
        let newPRs = 0
        let newIssues = 0

        // 🔹 Fetch all branches
        try {
            // Get all branches
            const branchesRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches`, { headers })
            const branches = branchesRes.data
            this.logger.info(`🌿 Found ${branches.length} branches`)

            for (const branch of branches) {
                const branchName = branch.name
                this.logger.info(`➡️ Branch: ${branchName}`)
                const encoded = encodeURIComponent(branchName)
                let page = 1

                while (true) {
                    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encoded}&per_page=100&page=${page}`
                    const res = await axios.get(commitsUrl, { headers })
                    const commits = res.data
                    if (!commits.length) break

                    for (const commit of commits) {
                        totalCommits++
                        const githubId = commit.node_id
                        if (!githubId || seenCommitIds.has(githubId)) continue
                        seenCommitIds.add(githubId)

                        const authorId = commit.commit?.author.name || 'unknown'
                        const message = commit.commit?.message || 'no message'
                        const date = commit.commit?.author?.date;

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
                            newCommits++
                            this.logger.debug(`✅ Commit saved: ${githubId} (${authorId})`)
                        } else {
                            this.logger.debug(`⏩ Commit already exists: ${githubId}`)
                        }
                    }

                    page++
                }
            }

            // Pull Requests
            const prsRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`, { headers })
            this.logger.info(`📥 Found ${prsRes.data.length} pull requests`)
            for (const pr of prsRes.data) {
                const githubId = pr.node_id
                const authorId = pr.user?.login || 'unknown'
                const message = pr.title
                const date = pr.created_at;

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
                        date: DateTime.fromISO(date)
                    })
                    newPRs++
                    this.logger.debug(`✅ PR saved: ${githubId} (${authorId})`)
                } else {
                    this.logger.debug(`⏩ PR already exists: ${githubId}`)
                }
            }

            // Issues
            const issuesRes = await axios.get(`https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100`, { headers })
            const issues = issuesRes.data.filter((i: any) => !i.pull_request)
            this.logger.info(`📌 Found ${issues.length} issues`)
            for (const issue of issues) {
                const githubId = issue.node_id
                const authorId = issue.user?.login || 'unknown'
                const message = issue.title;
                const date = issue.created_at;

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
                        date: DateTime.fromISO(date)
                    })
                    newIssues++
                    this.logger.debug(`✅ Issue saved: ${githubId} (${authorId})`)
                } else {
                    this.logger.debug(`⏩ Issue already exists: ${githubId}`)
                }
            }

            // 🔎 Reviews for each PR
            let newReviews = 0
            for (const pr of prsRes.data) {
                const prNumber = pr.number
                try {
                    const reviewsRes = await axios.get(
                        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
                        { headers }
                    )

                    for (const review of reviewsRes.data) {
                        const githubId = review.node_id
                        const authorId = review.user?.login || 'unknown'
                        const message = `Review state: ${review.state}`
                        const date = review.submitted_at;

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
                                date: DateTime.fromISO(date)
                            })
                            newReviews++
                            this.logger.debug(`✅ Review saved: ${githubId} (${authorId})`)
                        } else {
                            this.logger.debug(`⏩ Review already exists: ${githubId}`)
                        }
                    }
                } catch (reviewError) {
                    this.logger.warning(`⚠️ Skipped reviews for PR #${prNumber}: ${reviewError.message}`)
                }
            }

            this.logger.success(`✅ Done: ${newCommits} new commits, ${newPRs} PRs, ${newIssues} issues saved.`)
            this.logger.info(`🔎 Processed ${totalCommits} commits total across branches.`)
        } catch (error) {
            this.logger.error(`❌ Error syncing ${fullRepoName}`)
            this.logger.error(error?.response?.data || error.message)
        }
    }
}
