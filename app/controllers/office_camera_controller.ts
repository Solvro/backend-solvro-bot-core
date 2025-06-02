import { officeCameraPollValidator } from '#validators/office_camera'
import OfficeCameraStatus from '#models/office_camera_status'
import { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import fs from 'fs/promises'
import path from 'path'
import { DateTime } from 'luxon'

export default class OfficeCameraController {
  async update({ request, response }: HttpContext) {
    const { count, timestamp, file: image } = await request.validateUsing(officeCameraPollValidator)

    // Handle image (if provided)
    let savedImagePath: string | undefined
    const imageDir = path.join(process.cwd(), 'tmp', 'office-camera')
    const imageName = 'latest.jpg'
    const fullImagePath = path.join(imageDir, imageName)

    if (image) {
      try {
        await fs.mkdir(imageDir, { recursive: true })

        // Replace old image with the new one
        await image.move(imageDir, { name: imageName, overwrite: true })
        savedImagePath = fullImagePath
        logger.debug('Image saved to: ' + fullImagePath)
      } catch (err) {
        logger.error('Failed to save image:', err)
      }
    }

    // Save to database
    await OfficeCameraStatus.create({
      count,
      timestamp: DateTime.fromJSDate(timestamp),
      imagePath: savedImagePath,
    })

    response.status(201)
  }
}
