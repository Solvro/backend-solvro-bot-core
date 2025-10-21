import { args, BaseCommand, flags } from '@adonisjs/core/ace'
import axios from 'axios'
import GithubActivity from '#models/github_activity'
import { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import { DateTime } from 'luxon'

export default class GetGithubActivity extends BaseCommand {
    public static commandName = 'github:activity'
    public static description = 'Sync commits, PRs, and issues for a given GitHub repo or organization URL'

    @args.string({ description: 'GitHub repo or organization URL' })
    declare url: string

    @flags.boolean({ description: 'Exit immediately on rate limit instead of waiting' })
    declare exitOnRatelimit: boolean

    @flags.string({ description: 'Filter activity from this date onward (ISO format: YYYY-MM-DD)' })
    declare from?: string

    static options: CommandOptions = {
        startApp: true,
    };

    public async run() {
        const url = this.url
        const fromDate = this.from ? DateTime.fromISO(this.from) : null

        if (fromDate && !fromDate.isValid) {
            this.logger.error('❌ Invalid date format. Use YYYY-MM-DD format.')
            return
        }

        if (fromDate) {
            this.logger.info(`📅 Filtering activity from: ${fromDate.toISODate()}`)
        }

        // Check if URL is an organization or a repo
        const orgMatch = url.match(/github\.com\/([^/]+)\/?$/)
        const repoMatch = url.match(/github\.com\/([^/]+)\/([^/]+)/)

        if (orgMatch && !repoMatch) {
            // Organization URL
            const [_, org] = orgMatch
            await this.syncOrganization(org, fromDate)
        } else if (repoMatch) {
            // Repository URL
            const [_, owner, repo] = repoMatch
            await this.syncRepository(owner, repo, fromDate)
        } else {
            this.logger.error('❌ Invalid GitHub URL format. Provide either an organization or repository URL.')
        }
    }

    private async handleRateLimit(resetTimestamp: number) {
        const resetTime = DateTime.fromSeconds(resetTimestamp)
        const waitSeconds = resetTime.diff(DateTime.now(), 'seconds').seconds

        if (this.exitOnRatelimit) {
            this.logger.error(`❌ Rate limit exceeded. Resets at ${resetTime.toLocaleString(DateTime.DATETIME_FULL)}`)
            this.logger.error('Exiting due to --exit-on-ratelimit flag.')
            process.exit(1)
        }

        this.logger.warning(`⏳ Rate limit exceeded. Waiting ${Math.ceil(waitSeconds)} seconds until ${resetTime.toLocaleString(DateTime.TIME_SIMPLE)}...`)
        await new Promise(resolve => setTimeout(resolve, (waitSeconds + 5) * 1000))
        this.logger.info('✅ Rate limit reset. Continuing...')
    }

    private async makeGithubRequest(url: string, headers: any): Promise<any> {
        try {
            const response = await axios.get(url, { headers })
            return response.data
        } catch (error: any) {
            if (error.response?.status === 403 && error.response?.headers['x-ratelimit-remaining'] === '0') {
                const resetTimestamp = parseInt(error.response.headers['x-ratelimit-reset'])
                await this.handleRateLimit(resetTimestamp)
                // Retry the request after waiting
                const response = await axios.get(url, { headers })
                return response.data
            }
            throw error
        }
    }

    private async syncOrganization(org: string, fromDate: DateTime | null) {
        this.logger.info(`🏢 Syncing GitHub activity for organization: ${org}`)

        const headers = this.getHeaders()
        
        try {
            // Fetch all repositories in the organization
            let page = 1
            let allRepos: any[] = []
            
            while (true) {
                const reposUrl = `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}&sort=updated&direction=desc`
                const repos = await this.makeGithubRequest(reposUrl, headers)
                
                if (!repos.length) break

                // Filter by date if specified
                const filteredRepos = fromDate 
                    ? repos.filter((repo: any) => DateTime.fromISO(repo.updated_at) >= fromDate || DateTime.fromISO(repo.pushed_at) >= fromDate)
                    : repos

                allRepos.push(...filteredRepos)
                
                // If we're filtering by date and got repos older than the date, we can stop
                if (fromDate && filteredRepos.length < repos.length) {
                    break
                }

                page++
            }

            this.logger.info(`📦 Found ${allRepos.length} repositories in ${org}`)

            for (const repo of allRepos) {
                const repoName = repo.name
                this.logger.info(`\n${'='.repeat(60)}`)
                this.logger.info(`📁 Processing: ${org}/${repoName}`)
                this.logger.info(`${'='.repeat(60)}`)
                
                await this.syncRepository(org, repoName, fromDate)
            }

            this.logger.success(`\n✅ Completed syncing organization: ${org}`)
        } catch (error: any) {
            this.logger.error(`❌ Error syncing organization ${org}`)
            this.logger.error(error?.response?.data || error.message)
        }
    }

    private getHeaders() {
        if (env.get('GITHUB_TOKEN')) {
            return {
                Authorization: `Bearer ${env.get('GITHUB_TOKEN')}`,
                Accept: 'application/vnd.github+json',
            }
        }
        return {
            Accept: 'application/vnd.github+json',
        }
    }

    private async syncRepository(owner: string, repo: string, fromDate: DateTime | null) {
        const fullRepoName = `${owner}/${repo}`
        this.logger.info(`🔍 Syncing GitHub activity for: ${fullRepoName}`)

        const headers = this.getHeaders()

        const seenCommitIds = new Set<string>()
        let totalCommits = 0
        let newCommits = 0
        let newPRs = 0
        let newIssues = 0
        let newReviews = 0

        try {
            // 🔹 Fetch all branches
            const branches = await this.makeGithubRequest(
                `https://api.github.com/repos/${owner}/${repo}/branches`,
                headers
            )
            this.logger.info(`🌿 Found ${branches.length} branches`)

            for (const branch of branches) {
                const branchName = branch.name
                this.logger.info(`➡️ Branch: ${branchName}`)
                const encoded = encodeURIComponent(branchName)
                let page = 1

                while (true) {
                    let commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encoded}&per_page=100&page=${page}`
                    if (fromDate) {
                        commitsUrl += `&since=${fromDate.toISO()}`
                    }
                    
                    const commits = await this.makeGithubRequest(commitsUrl, headers)
                    if (!commits.length) break

                    for (const commit of commits) {
                        totalCommits++
                        const githubId = commit.node_id
                        if (!githubId || seenCommitIds.has(githubId)) continue
                        seenCommitIds.add(githubId)

                        const authorId = commit.author?.id?.toString() || 'unknown'
                        const message = commit.commit?.message || 'no message'
                        const date = commit.commit?.author?.date

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
            let prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100&sort=updated&direction=desc`
            const prs = await this.makeGithubRequest(prUrl, headers)
            
            const filteredPRs = fromDate 
                ? prs.filter((pr: any) => DateTime.fromISO(pr.updated_at) >= fromDate)
                : prs

            this.logger.info(`📥 Found ${filteredPRs.length} pull requests`)
            for (const pr of filteredPRs) {
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
                        date: DateTime.fromISO(date)
                    })
                    newPRs++
                    this.logger.debug(`✅ PR saved: ${githubId} (${authorId})`)
                } else {
                    this.logger.debug(`⏩ PR already exists: ${githubId}`)
                }
            }

            // Issues
            let issuesUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&sort=updated&direction=desc`
            const allIssues = await this.makeGithubRequest(issuesUrl, headers)
            
            const issues = allIssues
                .filter((i: any) => !i.pull_request)
                .filter((i: any) => !fromDate || DateTime.fromISO(i.updated_at) >= fromDate)

            this.logger.info(`📌 Found ${issues.length} issues`)
            for (const issue of issues) {
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
                        date: DateTime.fromISO(date)
                    })
                    newIssues++
                    this.logger.debug(`✅ Issue saved: ${githubId} (${authorId})`)
                } else {
                    this.logger.debug(`⏩ Issue already exists: ${githubId}`)
                }
            }

            // 🔎 Reviews for each PR
            for (const pr of filteredPRs) {
                const prNumber = pr.number
                try {
                    const reviews = await this.makeGithubRequest(
                        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
                        headers
                    )

                    for (const review of reviews) {
                        const githubId = review.node_id
                        const authorId = review.user?.id?.toString() || 'unknown'
                        const message = `Review state: ${review.state}`
                        const date = review.submitted_at

                        // Skip if date filter is set and review is older
                        if (fromDate && DateTime.fromISO(date) < fromDate) {
                            continue
                        }

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
                } catch (reviewError: any) {
                    this.logger.warning(`⚠️ Skipped reviews for PR #${prNumber}: ${reviewError.message}`)
                }
            }

            this.logger.success(`✅ Done: ${newCommits} new commits, ${newPRs} PRs, ${newIssues} issues, ${newReviews} reviews saved.`)
            this.logger.info(`🔎 Processed ${totalCommits} commits total across branches.`)
        } catch (error: any) {
            this.logger.error(`❌ Error syncing ${fullRepoName}`)
            this.logger.error(error?.response?.data || error.message)
        }
    }
}
