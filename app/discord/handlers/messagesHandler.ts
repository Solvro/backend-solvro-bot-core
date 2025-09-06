import ChannelActivity from '#models/channel_activity'
import DiscordActivity from '#models/discord_activity'
import { Message } from 'discord.js'

export async function messagesHandler(message: Message) {
  if (message.author.bot) return;
  const channelId = message.channel.id;

  let channelActivity = await ChannelActivity.query()
    .where('channel_id', channelId)
    .first();

  if (channelActivity) {
    channelActivity.messageCount++;
    await channelActivity.save();
  } else {
    await ChannelActivity.create({
      channelId,
      messageCount: 1,
    });
  }

  const discordId = message.author.id;
  const today = new Date()

  let userActivity = await DiscordActivity.query()
    .where('date', today)
    .andWhere('discord_id', discordId)
    .first();

  if (userActivity) {
    userActivity.messageCount++;
    await userActivity.save();
  } else {
    await DiscordActivity.create({
      date: today,
      discordId: discordId,
      messageCount: 1,
    });
  }
}
