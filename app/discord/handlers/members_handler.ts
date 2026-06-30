import type { Client, GuildMember } from "discord.js";

import logger from "@adonisjs/core/services/logger";

import env from "#start/env";

export async function guildMemberAdd(member: GuildMember) {
  const roleId = env.get("ROLE_ID");

  if (roleId === undefined) {
    return;
  }

  if (roleId.length === 0) {
    return;
  }

  try {
    const role = member.guild.roles.cache.get(roleId);
    if (role === undefined) {
      logger.info("Role not found");
      return;
    }
    await member.roles.add(role);
    logger.info(`Role added successfully.`);
  } catch {
    logger.error("Error while adding role");
  }
}

export async function ready(readyClient: Client<true>) {
  logger.info(`Discord bot is ready! Logged in as ${readyClient.user.tag}`);
}
