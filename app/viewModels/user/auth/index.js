import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import applicationMiddleware from 'viewModels/middlewares/application'
import tokenMiddleware from 'viewModels/middlewares/token'

import username from '../middlewares/username'

import id from './middlewares/id'

import list from './list'
import read from './read'
import save from './save'
import del from './delete'
import verification from './verification'

const applicationId = applicationMiddleware({
  required: false,
  secret: false,
})

const accessToken = tokenMiddleware({
  types: ['access'],
  user: true,
})

const router = new Router


router.get('/', accessToken, username, list)
router.get('/:id', accessToken, username, id, read)

router.use(body, applicationId, accessToken, username)

router.put(['/', '/save'], save)
router.post(['/', '/save'], save)
router.post('/verification', verification)

router.use(id)

router.patch('/:id', save)
router.post('/:id', save)

router.del('/:id', del)

router.post('/:id/verification', verification)

export default router
