import type { Client } from "discord.js";

import logger from "@adonisjs/core/services/logger";

export async function ready(readyClient: Client<true>) {
  logger.info(`Discord bot is ready! Logged in as ${readyClient.user.tag}`);
}
