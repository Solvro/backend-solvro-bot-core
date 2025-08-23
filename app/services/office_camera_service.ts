import { client } from "#app/discord/index";
import OfficeStatusMessage from "#models/office_status_message";
import { EmbedBuilder, TextChannel } from "discord.js";

export class OfficeCameraService {
  private async getOrCreateMessage(channel: TextChannel, messageId: string) {
    try {
      return await channel.messages.fetch(messageId);
    } catch {
      return await channel.send({ content: "This is office camera widget. Awaiting first update..." });
    }
  }

  async updateStatusMessages(image: string, peopleCount: number, lastUpdate: Date) {
    let messages = await OfficeStatusMessage.all();

    if (messages.length == 0) return;

    const embed = new EmbedBuilder()
      .setTitle('📷 Latest Camera Image')
      .setDescription(`Taken: <t:${Math.floor(lastUpdate.getTime() / 1000)}:R>`)
      .addFields({ name: 'People in Office', value: `**${peopleCount}**`, inline: true })
      .setImage('attachment://camera.jpg')
      .setColor(0x57f287);

    const guild = await client.getGuild();

    for (const msg of messages) {
      try {
        const channel = await guild.channels.fetch(msg.channelId);
        if (!channel || !channel.isTextBased()) continue;

        const message = await this.getOrCreateMessage(channel as TextChannel, msg.messageId);

        msg.messageId = message.id;
        await msg.save();

        await message.edit({ content: "", embeds: [embed], files: [{ attachment: image, name: 'camera.jpg' }], });
      } catch (err) {
        console.error(`Failed to update message ${msg.messageId}`, err);
      }
    }
  }

  async addChannelToUpdateList(channelId: string) {
    const guild = await client.getGuild();
    const channel = await guild.channels.fetch(channelId);

    if (!channel || !channel.isTextBased()) throw new Error('Channel does not exist or is not text based');

    const message = await (channel as TextChannel).send({ content: "This is office camera widget. Awaiting first update..." });

    await OfficeStatusMessage.create({
      channelId,
      messageId: message.id,
    });
  }
}

export default new OfficeCameraService()