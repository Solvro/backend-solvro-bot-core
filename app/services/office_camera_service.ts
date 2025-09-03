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

    async sendEmbedWithoutImage(message: Message, peopleCount: number, lastPresence: Date | null, lastUpdate: Date) {
        let presence = lastPresence == null ? "-" : `<t:${Math.floor(lastPresence.getTime() / 1000)}:R>`;

        const embed = new EmbedBuilder()
            .setTitle('📷 Latest Office Presence Update')
            .setDescription(`Updated: <t:${Math.floor(lastUpdate.getTime() / 1000)}:R>`)
            .addFields({ name: 'Current People in Office', value: `**${peopleCount}**`, inline: true })
            .addFields({ name: 'Last Presence Detected', value: presence, inline: true })
            .setColor(0x57f287);

        await message.edit({ content: "", embeds: [embed] });
    }

    async sendEmbedWithImage(message: Message, peopleCount: number, lastPresence: Date, imagePath: string, lastUpdate: Date) {
        const embed = new EmbedBuilder()
            .setTitle('📷 Latest Office Presence Update')
            .setDescription(`Updated: <t:${Math.floor(lastUpdate.getTime() / 1000)}:R>`)
            .addFields({ name: 'Current People in Office', value: `**${peopleCount}**`, inline: true })
            .addFields({ name: 'Last Presence Detected', value: `<t:${Math.floor(lastPresence.getTime() / 1000)}:R>`, inline: true })
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

                if (imagePath) await this.sendEmbedWithImage(message, peopleCount, msg.lastPresence ? new Date(msg.lastPresence.toString()) : lastUpdate, imagePath, lastUpdate);
                else await this.sendEmbedWithoutImage(message, peopleCount, msg.lastPresence ? new Date(msg.lastPresence.toString()) : null, lastUpdate);
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

    async removeChannelFromUpdateList(channelId: string) {
        const widget = await OfficeStatusMessage.query().where('channelId', channelId).first();

        const guild = await client.getGuild();
        const channel = await guild.channels.fetch(channelId);

        if (!channel || !channel.isTextBased() || !widget) return;

        const message = await channel.messages.fetch(widget?.messageId);

        if (!message) return;

        await message.delete();
        await widget.delete();
    }
}

export default new OfficeCameraService()