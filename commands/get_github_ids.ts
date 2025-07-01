import { BaseCommand } from '@adonisjs/core/ace'
import axios from 'axios'
import { CommandOptions } from '@adonisjs/core/types/ace'
import env from '#start/env'
import Member from '#models/member'

export default class GetGithubIds extends BaseCommand {
  static commandName = 'github:ids'
  static description = 'Get Github user ids from profile urls'

  static options: CommandOptions = {
    startApp: true,
  };

  async run() {
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

    const members = await Member.query().whereNull('github_id').whereNotNull("github_url");

    for (const member of members) {
      const profileUrl = member.githubUrl;

      const match = profileUrl?.match(/github\.com\/([^/]+)/)
      if (!match) {
        this.logger.error('❌ Invalid GitHub profile URL format.')
        continue
      }

      const [_, user] = match;
      this.logger.info(`🔍 Syncing GitHub ID for: ${user}`);

      const profileRes = await axios.get(`https://api.github.com/users/${user}`, { headers })
      const data = profileRes.data

      const ghId = data.id;

      member.githubId = ghId;
      await member.save();
    }
  }
}