import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import tokenMiddleware from 'viewModels/middlewares/token'

import username from './middlewares/username'

import list from './list'
import read from './read'
import save from './save'
import black from './black'
import restore from './restore'
import admin from './admin'


import message from './message'
import authorize from './authorize'
import application from './application'
import auth from './auth'
//
const accessToken = tokenMiddleware({
  types: ['access'],
  user: true,
  application: {
    required: false,
    secret: false,
  }
})

const router = new Router
const usernameRouter = new Router


router.use(accessToken)
router.opt(ctx => {})

router.get('/', list)

router.put(['/', '/save'], body, save)
router.post(['/', '/save'], body, save)

router.use('/application', application)
router.use('/userauth', auth)

router.use('/:username', username, usernameRouter)


usernameRouter.get('/', read)

usernameRouter.use('/message', message)
usernameRouter.use('/auth', auth)
usernameRouter.use('/authorize', authorize)
// usernameRouter.use('/application', application)

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
