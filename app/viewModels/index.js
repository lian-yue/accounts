/* @flow */
import Router from 'models/router'

import bodyMiddleware from 'viewModels/middlewares/body'
import tokenMiddleware from 'viewModels/middlewares/token'
import userMiddleware from './middlewares/user'

import uauth from './uauth'
import oauth from './oauth'

import auth from './auth'
import token from './token'
import message from './message'
import authorize from './authorize'
import application from './application'




import list from './user/list'
import read from './user/read'
import save from './user/save'
import black from './user/black'
import admin from './user/admin'

import type { Context } from 'koa'


const accessToken = tokenMiddleware({
  user: true,
  application: {
    required: false,
    secret: false,
  }
})

const router = new Router
const userRouter = new Router


router.use('/uauth', uauth)
router.use('/oauth', oauth)
router.use('/token', token)
router.use('/application', application)

router.use(accessToken)
router.opt(function (ctx: Context): void {})

router.get('/', list)

router.put(['/', '/save'], bodyMiddleware, save)
router.post(['/', '/save'], bodyMiddleware, save)

router.use('/auth', auth)

router.use('/:user', userMiddleware, userRouter)


userRouter.get('/', read)

userRouter.use('/token', token)
userRouter.use('/message', message)
userRouter.use('/auth', auth)
userRouter.use('/authorize', authorize)
userRouter.use('/application', application)


userRouter.patch('/', save)
userRouter.post('/', save)

userRouter.put('/black', black)
userRouter.post('/black', black)
userRouter.del('/black', black)

userRouter.put('/admin', admin)
userRouter.post('/admin', admin)
userRouter.del('/admin', admin)
export default router
