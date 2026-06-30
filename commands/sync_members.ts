import type { Guild } from "discord.js";
import { google } from "googleapis";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";
import db from "@adonisjs/lucid/services/db";

import Member, { MemberStatus } from "#models/member";
import env from "#start/env";

export default class SyncMembers extends BaseCommand {
  static commandName = "members:sync";
  static description = "Sync members from Google Sheets into DB";

  public static options: CommandOptions = {
    startApp: true,
  };

  private async resolveDiscordId(
    guild: Guild,
    username: string,
  ): Promise<string | null> {
    if (!username) {
      return null;
    }
    // Try to find user by username
    const member = guild.members.cache.find(
      (m) => m.user.username.toLowerCase() === username.toLowerCase(),
    );

    if (member === undefined) {
      this.logger.warning(`⚠️ Could not resolve Discord username: ${username}`);
      return null;
    }
    return member.user.id;
  }

  async run() {
    const discord = await import("#app/discord/index");
    await discord.client.loginBot();

    const guild = await discord.client.getGuild();
    // Fetch all members to ensure cache is populated
    await guild.members.fetch();

    const auth = new google.auth.GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
      keyFile: env.get("GOOGLE_CREDENTIALS_PATH"),
    });

    const sheets = google.sheets({ version: "v4", auth });

    const tabs: Record<string, MemberStatus> = {
      Aktywni: MemberStatus.ACTIVE,
      "Nowo przyjęci": MemberStatus.NEW,
      Nieaktywni: MemberStatus.INACTIVE,
    };

    for (const [tab, status] of Object.entries(tabs)) {
      this.logger.info(`📥 Fetching members from tab: ${tab}`);

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: env.get("GOOGLE_MEMBERS_SHEET_ID"),
        range: `${tab}!A2:Z`,
      });

      const rows = response.data.values ?? [];
      if (rows.length === 0) {
        this.logger.warning(`No rows found in tab: ${tab}`);
        continue;
      }

      const trx = await db.transaction();
      for (const row of rows as string[][]) {
        const [
          firstName = "",
          lastName = "",
          indexNumber = "",
          email = "",
          joinDate = "",
          _knowledge = "",
          faculty = "",
          fieldOfStudy = "",
          studyYear = "",
          messengerUrl = "",
          discordUsername = "",
          githubUrl = "",
          currentSection = "",
          currentProjects = "",
          currentRole = "",
          otherProjects = "",
          otherExperiences = "",
        ] = row;

        let discordId: string | null = null;

        if (discordUsername !== "") {
          const existing = await Member.query()
            .where("discord_id", discordUsername)
            .orWhere("email", email)
            .orWhere("index_number", indexNumber)
            .first();

          if (existing !== null) {
            discordId = existing.discordId;
          } else {
            discordId = await this.resolveDiscordId(guild, discordUsername);
          }
        }

        if (discordId === null) {
          this.logger.warning(
            `Skipping ${firstName} ${lastName} (no discordId resolved)`,
          );
          continue;
        }

        const githubUsername =
          githubUrl !== "" ? (githubUrl.split("/").pop() ?? null) : null;

        const member = await Member.firstOrCreate<typeof Member>(
          { discordId },
          {
            firstName: firstName !== "" ? firstName : null,
            lastName: lastName !== "" ? lastName : null,
            indexNumber: indexNumber !== "" ? indexNumber : null,
            email: email !== "" ? email : null,
            joinDate: joinDate !== "" ? new Date(joinDate) : undefined,
            faculty: faculty !== "" ? faculty : null,
            fieldOfStudy: fieldOfStudy !== "" ? fieldOfStudy : null,
            studyYear: studyYear !== "" ? studyYear : null,
            messengerUrl: messengerUrl !== "" ? messengerUrl : null,
            githubUrl: githubUrl !== "" ? githubUrl : null,
            githubUsername,
            status,
            currentSection: currentSection !== "" ? currentSection : null,
            currentRole: currentRole !== "" ? currentRole : null,
            otherProjects: otherProjects !== "" ? otherProjects : null,
            otherExperiences: otherExperiences !== "" ? otherExperiences : null,
            currentProjects: currentProjects !== "" ? currentProjects : null,
          },
        );

        member.merge({
          firstName: firstName !== "" ? firstName : null,
          lastName: lastName !== "" ? lastName : null,
          indexNumber: indexNumber !== "" ? indexNumber : null,
          email: email !== "" ? email : null,
          joinDate: joinDate !== "" ? new Date(joinDate) : undefined,
          faculty: faculty !== "" ? faculty : null,
          fieldOfStudy: fieldOfStudy !== "" ? fieldOfStudy : null,
          studyYear: studyYear !== "" ? studyYear : null,
          messengerUrl: messengerUrl !== "" ? messengerUrl : null,
          githubUrl: githubUrl !== "" ? githubUrl : null,
          githubUsername,
          status,
          currentSection: currentSection !== "" ? currentSection : null,
          currentRole: currentRole !== "" ? currentRole : null,
          otherProjects: otherProjects !== "" ? otherProjects : null,
          otherExperiences: otherExperiences !== "" ? otherExperiences : null,
          currentProjects: currentProjects !== "" ? currentProjects : null,
        });
        await member.useTransaction(trx).save();
      }

      await trx.commit();
    }

    await discord.client.destroy();

    this.logger.success("✅ Members synced from Google Sheets");
  }
}
