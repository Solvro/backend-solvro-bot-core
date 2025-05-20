/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/
import router from '@adonisjs/core/services/router'
import AutoSwagger from 'adonis-autoswagger'
import swagger from '#config/swagger'
import OfficeCameraController from '#controllers/office_camera_controller'

const HealthChecksController = () => import('#controllers/health_checks_controller')
const RecordingsController = () => import('#controllers/recordings_controller')

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router.get('/swagger', async () => {
  return AutoSwagger.default.docs(router.toJSON(), swagger)
})

router.get('/docs', async () => {
  return AutoSwagger.default.scalar('/swagger')
})

router.get('/health', [HealthChecksController])

router.patch('/recordings/:id', [RecordingsController, 'register'])

router.post('/office/camera/poll', [OfficeCameraController, 'update'])
