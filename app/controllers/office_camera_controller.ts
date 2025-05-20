import { client } from '#app/discord/index'
import {
  officeCameraImageUploadValidator,
  officeCameraPollValidator,
} from '#validators/office_camera'
import { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import { AttachmentBuilder, EmbedBuilder, TextChannel } from 'discord.js'
import fs from 'fs/promises'

export default class OfficeCameraController {
  async cameraPoll({ request }: HttpContext) {
    const { count, timestamp } = await request.validateUsing(officeCameraPollValidator)

    logger.debug('Update from camera received: ' + JSON.stringify({ count, timestamp }))

    const unix = Math.floor(new Date(timestamp).getTime() / 1000)
    const isOccupied = count > 0
    const embedColor = isOccupied ? 0x57f287 : 0x2f3136 // green or gray

    const embed = new EmbedBuilder()
      .setTitle('🏢 Office Presence Update')
      .addFields(
        { name: 'People in Office', value: `**${count}**`, inline: true },
        { name: 'Last Update', value: `<t:${unix}:R>`, inline: true }
      )
      .setColor(embedColor)
      .setTimestamp(new Date(timestamp))

    const channel = client.channels.cache.get('1221473000524611628') as TextChannel
    if (!channel || !channel.isTextBased()) {
      logger.error('Discord channel not found or not text-based.')
      return
    }

    await channel.send({
      content: isOccupied ? '👥 Someone is in the office.' : '🚪 Office is empty.',
      embeds: [embed],
    })

    logger.debug('Presence embed sent to Discord.')
  }

  async cameraImage({ request }: HttpContext) {
    const { image, timestamp } = await request.validateUsing(officeCameraImageUploadValidator)

    // Ensure file has been moved to tmp path
    if (!image.tmpPath) {
      logger.error('No tmpPath found for uploaded image.')
      return
    }

    try {
      const buffer = await fs.readFile(image.tmpPath)

      const attachment = new AttachmentBuilder(buffer, { name: 'camera.jpg' })

      const unix = Math.floor(new Date(timestamp).getTime() / 1000)

      const embed = new EmbedBuilder()
        .setTitle('📷 New Camera Image')
        .setDescription(`Taken: <t:${unix}:R>`)
        .setImage('attachment://camera.jpg')
        .setColor(0x2f3136)
        .setTimestamp(new Date(timestamp))

      const channel = client.channels.cache.get('1221473000524611628') as TextChannel
      if (!channel || !channel.isTextBased()) {
        logger.error('Discord channel not found or not text-based.')
        return
      }

      await channel.send({
        content: '',
        embeds: [embed],
        files: [attachment],
      })

      logger.debug('Camera image sent to Discord channel.')
    } catch (err) {
      logger.error('Failed to process camera image upload:', err)
    } finally {
      try {
        await fs.unlink(image.tmpPath)
        logger.debug('Temporary image file cleaned up.')
      } catch (cleanupError) {
        logger.warn('Could not delete temp file:', cleanupError)
      }
    }
  }
}
