import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import Member from "#models/member";
import env from "#start/env";

interface GithubUserResponse {
  id: number;
  login: string;
}

export default class GetGithubIds extends BaseCommand {
  static commandName = "github:ids";
  static description = "Get Github user ids from profile urls";

  static options: CommandOptions = {
    startApp: true,
  };

  async run() {
    const token = env.get("GITHUB_TOKEN");
    const headers: Record<string, string> =
      token !== undefined
        ? {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          }
        : {
            Accept: "application/vnd.github+json",
          };

    const members = await Member.query()
      .whereNull("github_id")
      .whereNotNull("github_url");

    for (const member of members) {
      const profileUrl = member.githubUrl;

      const match = profileUrl?.match(/github\.com\/([^/]+)/);
      if (match === null || match === undefined) {
        this.logger.error("❌ Invalid GitHub profile URL format.");
        continue;
      }

      const [_, user] = match;
      this.logger.info(`🔍 Syncing GitHub ID for: ${user}`);

      const response = await fetch(`https://api.github.com/users/${user}`, {
        headers,
      });
      const data = (await response.json()) as GithubUserResponse;

      const ghId = data.id;

      member.githubId = String(ghId);
      await member.save();
    }
  }
}
