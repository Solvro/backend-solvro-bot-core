import type { ButtonInteraction } from "discord.js";

export const buttonHandlers: Record<
  string,
  (interaction: ButtonInteraction) => Promise<void>
> = {
  // Example: member_discord_stats_${id}
  // "member_discord_stats_": handleMemberDiscordStats,
};
