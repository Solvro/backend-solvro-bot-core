import { officeCameraPollValidator } from '#validators/office_camera'
import { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'

export default class OfficeCameraController {
  async cameraPoll({ request }: HttpContext) {
    const { count, timestamp } = await request.validateUsing(officeCameraPollValidator)

    logger.debug('Update from camera recieved: ' + { count, timestamp })
  }
}
