import { DateTime } from "luxon";

import { BaseCommand, args, flags } from "@adonisjs/core/ace";
import { CommandOptions } from "@adonisjs/core/types/ace";

import GithubActivity from "#models/github_activity";
import env from "#start/env";

interface GithubUser {
  id: number;
  login: string;
}

interface GithubCommit {
  node_id: string;
  commit: {
    author?: {
      date: string;
    };
    message: string;
  };
  author?: GithubUser | null;
}

interface GithubBranch {
  name: string;
}

interface GithubPr {
  node_id: string;
  number: number;
  title: string;
  created_at: string;
  updated_at: string;
  user?: GithubUser | null;
}

interface GithubIssue {
  node_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  user?: GithubUser | null;
  pull_request?: unknown;
}

interface GithubReview {
  node_id: string;
  state: string;
  submitted_at: string;
  user?: GithubUser | null;
}

interface GithubRepo {
  name: string;
  updated_at: string;
  pushed_at: string;
}

export default class GetGithubActivity extends BaseCommand {
  public static commandName = "github:activity";
  public static description =
    "Sync commits, PRs, and issues for a given GitHub repo or organization URL";

  @args.string({ description: "GitHub repo or organization URL" })
  declare url: string;

  @flags.boolean({
    description: "Exit immediately on rate limit instead of waiting",
  })
  declare exitOnRatelimit: boolean;

  @flags.string({
    description:
      "Filter activity from this date onward (ISO format: YYYY-MM-DD)",
  })
  declare from?: string;

  static options: CommandOptions = {
    startApp: true,
  };

  public async run() {
    const url = this.url;
    const fromDate =
      this.from !== undefined ? DateTime.fromISO(this.from) : null;

    if (fromDate !== null && !fromDate.isValid) {
      this.logger.error("❌ Invalid date format. Use YYYY-MM-DD format.");
      return;
    }

    if (fromDate !== null) {
      this.logger.info(`📅 Filtering activity from: ${fromDate.toISODate()}`);
    }

    // Check if URL is an organization or a repo
    const orgMatch = /github\.com\/([^/]+)\/?$/.exec(url);
    const repoMatch = /github\.com\/([^/]+)\/([^/]+)/.exec(url);

    if (orgMatch !== null && repoMatch === null) {
      // Organization URL
      const [_, org] = orgMatch;
      await this.syncOrganization(org, fromDate);
    } else if (repoMatch !== null) {
      // Repository URL
      const [_, owner, repo] = repoMatch;
      await this.syncRepository(owner, repo, fromDate);
    } else {
      this.logger.error(
        "❌ Invalid GitHub URL format. Provide either an organization or repository URL.",
      );
    }
  }

  private async handleRateLimit(resetTimestamp: number) {
    const resetTime = DateTime.fromSeconds(resetTimestamp);
    const waitSeconds = resetTime.diff(DateTime.now(), "seconds").seconds;

    if (this.exitOnRatelimit) {
      this.logger.error(
        `❌ Rate limit exceeded. Resets at ${resetTime.toLocaleString(DateTime.DATETIME_FULL)}`,
      );
      this.logger.error("Exiting due to --exit-on-ratelimit flag.");
      process.exit(1);
    }

    this.logger.warning(
      `⏳ Rate limit exceeded. Waiting ${Math.ceil(waitSeconds)} seconds until ${resetTime.toLocaleString(DateTime.TIME_SIMPLE)}...`,
    );
    await new Promise((resolve) =>
      setTimeout(resolve, (waitSeconds + 5) * 1000),
    );
    this.logger.info("✅ Rate limit reset. Continuing...");
  }

  private async makeGithubRequest<T>(
    url: string,
    headers: Record<string, string>,
  ): Promise<T> {
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) {
        if (
          response.status === 403 &&
          response.headers.get("x-ratelimit-remaining") === "0"
        ) {
          const resetTimestamp = Number.parseInt(
            response.headers.get("x-ratelimit-reset") ?? "",
          );
          await this.handleRateLimit(resetTimestamp);
          // Retry the request after waiting
          const retryResponse = await fetch(url, { headers });
          const retryData = (await retryResponse.json()) as T;
          return retryData;
        }
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`,
        );
      }
      const data = (await response.json()) as T;
      return data;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        "response" in error &&
        typeof (error as Record<string, unknown>).response === "object" &&
        (error as Record<string, unknown>).response !== null
      ) {
        const errResponse = (error as Record<string, unknown>)
          .response as Record<string, unknown>;
        if (
          errResponse.status === 403 &&
          (errResponse.headers as Record<string, string>)[
            "x-ratelimit-remaining"
          ] === "0"
        ) {
          const resetTimestamp = Number.parseInt(
            (errResponse.headers as Record<string, string>)[
              "x-ratelimit-reset"
            ] ?? "",
          );
          await this.handleRateLimit(resetTimestamp);
          const retryResponse = await fetch(url, { headers });
          const retryData = (await retryResponse.json()) as T;
          return retryData;
        }
      }
      throw error;
    }
  }

  private async syncOrganization(org: string, fromDate: DateTime | null) {
    this.logger.info(`🏢 Syncing GitHub activity for organization: ${org}`);

    const headers = this.getHeaders();

    try {
      // Fetch all repositories in the organization
      let page = 1;
      const allRepos: GithubRepo[] = [];

      for (;;) {
        const reposUrl = `https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}&sort=updated&direction=desc`;
        const repos = await this.makeGithubRequest<GithubRepo[]>(
          reposUrl,
          headers,
        );

        if (repos.length === 0) {
          break;
        }

        // Filter by date if specified
        const filteredRepos =
          fromDate !== null
            ? repos.filter(
                (repo: GithubRepo) =>
                  DateTime.fromISO(repo.updated_at) >= fromDate ||
                  DateTime.fromISO(repo.pushed_at) >= fromDate,
              )
            : repos;

        allRepos.push(...filteredRepos);

        // If we're filtering by date and got repos older than the date, we can stop
        if (fromDate !== null && filteredRepos.length < repos.length) {
          break;
        }

        page++;
      }

      this.logger.info(`📦 Found ${allRepos.length} repositories in ${org}`);

      for (const repo of allRepos) {
        const repoName = repo.name;
        this.logger.info(`\n${"=".repeat(60)}`);
        this.logger.info(`📁 Processing: ${org}/${repoName}`);
        this.logger.info("=".repeat(60));

        await this.syncRepository(org, repoName, fromDate);
      }

      this.logger.success(`\n✅ Completed syncing organization: ${org}`);
    } catch (error: unknown) {
      this.logger.error(`❌ Error syncing organization ${org}`);
      this.logger.error(error instanceof Error ? error.message : String(error));
    }
  }

  private getHeaders(): Record<string, string> {
    if (env.get("GITHUB_TOKEN") !== undefined) {
      return {
        Authorization: `Bearer ${env.get("GITHUB_TOKEN")}`,
        Accept: "application/vnd.github+json",
      };
    }
    return {
      Accept: "application/vnd.github+json",
    };
  }

  private async syncRepository(
    owner: string,
    repo: string,
    fromDate: DateTime | null,
  ) {
    const fullRepoName = `${owner}/${repo}`;
    this.logger.info(`🔍 Syncing GitHub activity for: ${fullRepoName}`);

    const headers = this.getHeaders();

    const seenCommitIds = new Set<string>();
    let totalCommits = 0;
    let newCommits = 0;
    let newPRs = 0;
    let newIssues = 0;
    let newReviews = 0;

    try {
      // 🔹 Fetch all branches
      const branches = await this.makeGithubRequest<GithubBranch[]>(
        `https://api.github.com/repos/${owner}/${repo}/branches`,
        headers,
      );
      this.logger.info(`🌿 Found ${branches.length} branches`);

      for (const branch of branches) {
        const branchName = branch.name;
        this.logger.info(`➡️ Branch: ${branchName}`);
        const encoded = encodeURIComponent(branchName);
        let page = 1;

        for (;;) {
          let commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${encoded}&per_page=100&page=${page}`;
          if (fromDate !== null) {
            commitsUrl += `&since=${fromDate.toISO()}`;
          }

          const commits = await this.makeGithubRequest<GithubCommit[]>(
            commitsUrl,
            headers,
          );
          if (commits.length === 0) {
            break;
          }

          for (const commit of commits) {
            totalCommits++;
            const githubId = commit.node_id;
            if (seenCommitIds.has(githubId)) {
              continue;
            }
            seenCommitIds.add(githubId);

            const authorId = commit.author?.id.toString() ?? "unknown";
            const message = commit.commit.message;
            const date = commit.commit.author?.date ?? "";

            const exists = await GithubActivity.query()
              .where("githubId", githubId)
              .where("type", "commit")
              .first();

            if (exists === null) {
              await GithubActivity.create({
                githubId,
                type: "commit" as const,
                message,
                authorGithubId: authorId,
                repo: fullRepoName,
                date: DateTime.fromISO(date),
              });
              newCommits++;
              this.logger.debug(`✅ Commit saved: ${githubId} (${authorId})`);
            } else {
              this.logger.debug(`⏩ Commit already exists: ${githubId}`);
            }
          }

          page++;
        }
      }

      // Pull Requests
      const prUrl = `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100&sort=updated&direction=desc`;
      const prs = await this.makeGithubRequest<GithubPr[]>(prUrl, headers);

      const filteredPRs =
        fromDate !== null
          ? prs.filter(
              (pr: GithubPr) => DateTime.fromISO(pr.updated_at) >= fromDate,
            )
          : prs;

      this.logger.info(`📥 Found ${filteredPRs.length} pull requests`);
      for (const pr of filteredPRs) {
        const githubId = pr.node_id;
        const authorId = pr.user?.id.toString() ?? "unknown";
        const message = pr.title;
        const date = pr.created_at;

        const exists = await GithubActivity.query()
          .where("githubId", githubId)
          .where("type", "pr")
          .first();

        if (exists === null) {
          await GithubActivity.create({
            githubId,
            type: "pr" as const,
            message,
            authorGithubId: authorId,
            repo: fullRepoName,
            date: DateTime.fromISO(date),
          });
          newPRs++;
          this.logger.debug(`✅ PR saved: ${githubId} (${authorId})`);
        } else {
          this.logger.debug(`⏩ PR already exists: ${githubId}`);
        }
      }

      // Issues
      const issuesUrl = `https://api.github.com/repos/${owner}/${repo}/issues?state=all&per_page=100&sort=updated&direction=desc`;
      const allIssues = await this.makeGithubRequest<GithubIssue[]>(
        issuesUrl,
        headers,
      );

      const issues = allIssues
        .filter((i: GithubIssue) => i.pull_request === undefined)
        .filter(
          (i: GithubIssue) =>
            fromDate === null || DateTime.fromISO(i.updated_at) >= fromDate,
        );

      this.logger.info(`📌 Found ${issues.length} issues`);
      for (const issue of issues) {
        const githubId = issue.node_id;
        const authorId = issue.user?.id.toString() ?? "unknown";
        const message = issue.title;
        const date = issue.created_at;

        const exists = await GithubActivity.query()
          .where("githubId", githubId)
          .where("type", "issue")
          .first();

        if (exists === null) {
          await GithubActivity.create({
            githubId,
            type: "issue" as const,
            message,
            authorGithubId: authorId,
            repo: fullRepoName,
            date: DateTime.fromISO(date),
          });
          newIssues++;
          this.logger.debug(`✅ Issue saved: ${githubId} (${authorId})`);
        } else {
          this.logger.debug(`⏩ Issue already exists: ${githubId}`);
        }
      }

      // 🔎 Reviews for each PR
      for (const pr of filteredPRs) {
        const prNumber = pr.number;
        try {
          const reviews = await this.makeGithubRequest<GithubReview[]>(
            `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
            headers,
          );

          for (const review of reviews) {
            const githubId = review.node_id;
            const authorId = review.user?.id.toString() ?? "unknown";
            const message = `Review state: ${review.state}`;
            const date = review.submitted_at;

            // Skip if date filter is set and review is older
            if (fromDate !== null && DateTime.fromISO(date) < fromDate) {
              continue;
            }

            const exists = await GithubActivity.query()
              .where("githubId", githubId)
              .where("type", "review")
              .first();

            if (exists === null) {
              await GithubActivity.create({
                githubId,
                type: "review" as const,
                message,
                authorGithubId: authorId,
                repo: fullRepoName,
                date: DateTime.fromISO(date),
              });
              newReviews++;
              this.logger.debug(`✅ Review saved: ${githubId} (${authorId})`);
            } else {
              this.logger.debug(`⏩ Review already exists: ${githubId}`);
            }
          }
        } catch (reviewError: unknown) {
          this.logger.warning(
            `⚠️ Skipped reviews for PR #${prNumber}: ${reviewError instanceof Error ? reviewError.message : String(reviewError)}`,
          );
        }
      }

      this.logger.success(
        `✅ Done: ${newCommits} new commits, ${newPRs} PRs, ${newIssues} issues, ${newReviews} reviews saved.`,
      );
      this.logger.info(
        `🔎 Processed ${totalCommits} commits total across branches.`,
      );
    } catch (error: unknown) {
      this.logger.error(`❌ Error syncing ${fullRepoName}`);
      this.logger.error(error instanceof Error ? error.message : String(error));
    }
  }
}
