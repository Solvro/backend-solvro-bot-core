import ChannelActivity from '#models/channel_activity'
import DiscordActivity from '#models/discord_activity'
import { Message } from 'discord.js'

// JEDYNY handler, którego importujesz w index.ts!
export async function messagesHandler(message: Message) {
  // Pomijaj wiadomości od botów
  if (message.author.bot) return;

  // --- Aktywność kanałowa (ChannelActivity) ---
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

  // --- Aktywność użytkownika dzienna (DiscordActivity) ---
  const discordId = message.author.id;
  const todayStr = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"

  let userActivity = await DiscordActivity.query()
    .where('date', todayStr)
    .andWhere('discord_id', discordId)
    .first();

  if (userActivity) {
    userActivity.messageCount++;
    await userActivity.save();
  } else {
    await DiscordActivity.create({
      date: todayStr,
      discordId: discordId,
      messageCount: 1,
    });
  }
}
