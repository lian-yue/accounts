import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import tokenMiddleware from 'viewModels/middlewares/token'
import userMiddleware from './middlewares/user'

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


const accessToken = tokenMiddleware({
  types: ['access'],
  user: true,
  application: {
    required: false,
    secret: false,
  }
})

const router = new Router
const userRouter = new Router


router.use('/application', application)
router.use(accessToken)
router.opt(ctx => {})

router.get('/', list)

router.put(['/', '/save'], body, save)
router.post(['/', '/save'], body, save)

router.use('/userauth', auth)

router.use('/:user', userMiddleware, userRouter)


userRouter.get('/', read)

userRouter.use('/message', message)
userRouter.use('/auth', auth)
userRouter.use('/authorize', authorize)
userRouter.use('/application', application)

userRouter.patch('/', save)
userRouter.post('/', save)

userRouter.put('/black', black)
userRouter.post('/black', black)

userRouter.del('/black', restore)
userRouter.post('/restore', restore)


userRouter.put('/admin', admin)
userRouter.post('/admin', admin)
userRouter.del('/admin', admin)


export default router
