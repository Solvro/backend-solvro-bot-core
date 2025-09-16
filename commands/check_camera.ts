import OfficeCameraDownMessage from '#models/office_camera_down_message'
import OfficeStatusMessage from '#models/office_status_message'
import env from '#start/env'
import { BaseCommand } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'
import { DateTime } from 'luxon'

export default class CheckCamera extends BaseCommand {
  static commandName = 'check:camera'
  static description = 'Check if office camera is working properly'

  public static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const camera_messages = await OfficeStatusMessage.all();

    // Check if all messages are older than threshold
    const thresholdMinutes = env.get("OFFICE_CAMERA_DOWN_TIME_THRESHOLD_MINUTES", 10);
    const thresholdMillis = thresholdMinutes * 60 * 1000;
    const now = new Date();

    const allOld = camera_messages.every(msg => msg.lastUpdate && (now.getTime() - new Date(msg.lastUpdate.toString()).getTime()) > thresholdMillis);

    if (!allOld) {
      this.logger.info('Camera is working properly.');
      return;
    }

    this.logger.warning(`⚠️ Camera might be down! Status messages were not updated for more than ${thresholdMinutes} minutes.`);

    const discord = await import('#app/discord/index')
    await discord.client.loginBot();

    const dmMessages = await OfficeCameraDownMessage.all();

    for (const dmMessage of dmMessages) {
      try {
        const user = await discord.client.users.fetch(dmMessage.discordUserId);
        await user.send(`⚠️ Warning: Office camera might be down! Status messages were not updated for more than ${thresholdMinutes} minutes.`);
        this.logger.info(`Sent camera down notification to user ID: ${dmMessage.discordUserId} (username: ${user.username})`);

        dmMessage.lastMessageSentAt = DateTime.now();
        await dmMessage.save();
      } catch (err) {
        this.logger.error(`Failed to send DM to user ID: ${dmMessage.discordUserId}`, err);
      }
    }

    await discord.client.destroy();
  }
}