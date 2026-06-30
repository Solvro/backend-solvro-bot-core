import type { Message } from "discord.js";

import ChannelActivity from "#models/channel_activity";
import DiscordActivity from "#models/discord_activity";

export async function messagesHandler(message: Message) {
  if (message.author.bot) {
    return;
  }
  const channelId = message.channel.id;

  const channelActivity = await ChannelActivity.query()
    .where("channel_id", channelId)
    .first();

  if (channelActivity !== null) {
    channelActivity.messageCount++;
    await channelActivity.save();
  } else {
    await ChannelActivity.create({
      channelId,
      messageCount: 1,
    });
  }

  const discordId = message.author.id;
  const today = new Date();

  const userActivity = await DiscordActivity.query()
    .where("date", today)
    .andWhere("discord_id", discordId)
    .first();

  if (userActivity !== null) {
    userActivity.messageCount++;
    await userActivity.save();
  } else {
    await DiscordActivity.create({
      date: today,
      discordId,
      messageCount: 1,
    });
  }
}
