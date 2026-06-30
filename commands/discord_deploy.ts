import { REST, Routes } from "discord.js";
import type {
  RESTGetAPIGuildResult,
  RESTGetAPIOAuth2CurrentApplicationResult,
  RESTPutAPIApplicationCommandsResult,
} from "discord.js";

import { BaseCommand } from "@adonisjs/core/ace";
import type { CommandOptions } from "@adonisjs/core/types/ace";

import { commands } from "#app/discord/index";
import env from "#start/env";

export default class DeployCommands extends BaseCommand {
  static commandName = "discord:deploy";
  static description = "Deploy slash commands with Discord REST API";

  static options: CommandOptions = {};

  async run() {
    const rest = new REST({ version: "10" }).setToken(env.get("DISCORD_TOKEN"));
    const discordClientId = env.get("DISCORD_CLIENT_ID");
    const discordGuildId = env.get("DISCORD_GUILD_ID");
    const guild = (await rest.get(
      Routes.guild(discordGuildId),
    )) as RESTGetAPIGuildResult;
    const app = (await rest.get(
      Routes.currentApplication(),
    )) as RESTGetAPIOAuth2CurrentApplicationResult;
    this.logger.info(`App name: ${app.name}, guild name: ${guild.name}`);
    this.logger.debug(`Discord Client ID: ${discordClientId}`);
    this.logger.debug(`Discord Guild ID: ${discordGuildId}`);
    try {
      this.logger.info(
        `Started refreshing ${commands.length} application (/) commands.`,
      );
      const commandResults = await Promise.all(
        commands.map((command) => command.cmd()),
      );
      const body = commandResults.map((cmd) => cmd.toJSON());

      const data = (await rest.put(
        Routes.applicationGuildCommands(discordClientId, discordGuildId),
        {
          body,
        },
      )) as RESTPutAPIApplicationCommandsResult;

      this.logger.info(
        `Successfully reloaded ${data.length} application (/) commands.`,
      );
    } catch (error: unknown) {
      this.logger.error(error instanceof Error ? error.message : String(error));
    }
  }
}
