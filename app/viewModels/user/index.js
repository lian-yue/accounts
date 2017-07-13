import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import applicationMiddleware from 'viewModels/middlewares/application'
import tokenMiddleware from 'viewModels/middlewares/token'

import username from './middlewares/username'

import list from './list'
import read from './read'
import save from './save'
import black from './black'
import restore from './restore'
import admin from './admin'
import log from './log'

// import auth from './auth'
import notification from './notification'


const applicationId = applicationMiddleware({
  required: false,
  secret: false,
})

const accessToken = tokenMiddleware({
  types: ['access'],
  user: true,
})

const router = new Router
const usernameRouter = new Router


router.use(applicationId, accessToken)
router.opt(ctx => {})

router.get('/', list)

router.put(['/', '/save'], body, save)
router.post(['/', '/save'], body, save)

// router.use('/userauth', auth)

router.use('/:username', username, usernameRouter)


usernameRouter.get('/' read)
usernameRouter.get('/log', log)

usernameRouter.use('/notification', notification)
// usernameRouter.use('/auth', auth)

usernameRouter.patch('/', save)
usernameRouter.post('/', save)

usernameRouter.put('/black', black)
usernameRouter.post('/black', black)

usernameRouter.del('/black', restore)
usernameRouter.post('/restore', restore)


usernameRouter.put('/admin', admin)
usernameRouter.post('/admin', admin)
usernameRouter.del('/admin', admin)


export default router
