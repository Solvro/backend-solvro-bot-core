/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
const RecordingsController = () => import('#controllers/recordings_controller')

router.get('/', async () => {
  return {
    hello: 'world',
  }
})

router.patch('/recordings/:id', [RecordingsController, 'register'])
