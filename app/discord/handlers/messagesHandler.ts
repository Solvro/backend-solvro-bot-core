import DiscordActivity from '#models/discord_activity'
import { Message } from 'discord.js'

export async function messagesHandler(message: Message) {
  const discordId = message.author.id
  const today = new Date()

  let activity = await DiscordActivity.query()
    .where('date', today)
    .andWhere('discord_id', discordId)
    .first()

  if (activity) {
    activity.messageCount++
    await activity.save()
  } else {
    activity = await DiscordActivity.create({
      date: today,
      discordId: discordId,
      messageCount: 1,
    })
  }
}
