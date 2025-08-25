import { client } from "#app/discord/index";
import OfficeStatusMessage from "#models/office_status_message";
import { EmbedBuilder, Message, TextChannel } from "discord.js";
import { DateTime } from "luxon";

export class OfficeCameraService {
    private async getOrCreateMessage(channel: TextChannel, messageId: string) {
        try {
            return await channel.messages.fetch(messageId);
        } catch {
            return await channel.send({ content: "This is office camera widget. Awaiting first update..." });
        }
    }

    async sendEmbedWithoutImage(message: Message, peopleCount: number, lastPresence: Date,) {
        const embed = new EmbedBuilder()
            .setTitle('📷 Latest Office Presence Update')
            .setDescription(`Last Presence Detected: <t:${Math.floor(lastPresence.getTime() / 1000)}:R>`)
            .addFields({ name: 'Current People in Office', value: `**${peopleCount}**`, inline: true })
            .setColor(0x57f287);
            
        await message.edit({ content: "", embeds: [embed] });
    }

    async sendEmbedWithImage(message: Message, peopleCount: number, lastUpdate: Date, imagePath: string) {
        const embed = new EmbedBuilder()
            .setTitle('📷 Latest Office Presence Update')
            .setDescription(`Last Presence Detected: <t:${Math.floor(lastUpdate.getTime() / 1000)}:R>`)
            .addFields({ name: 'Current People in Office', value: `**${peopleCount}**`, inline: true })
            .setImage('attachment://camera.jpg')
            .setColor(0x57f287);

        await message.edit({ content: "", embeds: [embed], files: [{ attachment: imagePath, name: 'camera.jpg' }], });
    }

    async updateStatusMessages(peopleCount: number, lastUpdate: Date, image: string | null = null) {
        let messages = await OfficeStatusMessage.all();

        if (messages.length == 0) return;

        const guild = await client.getGuild();

        for (const msg of messages) {
            try {
                const channel = await guild.channels.fetch(msg.channelId);
                if (!channel || !channel.isTextBased()) continue;

                const message = await this.getOrCreateMessage(channel as TextChannel, msg.messageId);

                msg.messageId = message.id;
                msg.count = peopleCount;
                if (peopleCount > 0) msg.lastPresence = DateTime.fromJSDate(lastUpdate);
                if (image) msg.imagePath = image;

                await msg.save();

                const imagePath = image ?? msg.imagePath;
                
                if (imagePath) await this.sendEmbedWithImage(message, peopleCount, msg.lastPresence ? new Date(msg.lastPresence.toString()) : lastUpdate, imagePath);
                else await this.sendEmbedWithoutImage(message, peopleCount, msg.lastPresence ? new Date(msg.lastPresence.toString()) : lastUpdate);
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