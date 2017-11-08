/* @flow */
import Router from 'models/router'

import bodyMiddleware from 'viewModels/middlewares/body'
import tokenMiddleware from 'viewModels/middlewares/token'
import rateLimitMiddleware from 'viewModels/middlewares/rateLimit'

import applicationMiddleware from 'viewModels/middlewares/application'
import idMiddleware from './middlewares/token'

import me from './me'
import list from './list'
import read from './read'
import save from './save'
import del from './delete'

import type { Context } from 'koa'


const applicationIdMiddleware = applicationMiddleware({
  secret: false,
  required: false,
  auths: ['cors'],
})


const rateLimitReadMiddleware = rateLimitMiddleware({
  name: 'auth_token',
  ip: true,
  limit: 20,
})

const accessToken = tokenMiddleware({
  application: {
    required: false,
    secret: false,
  },
})


const router = new Router

router.get('/me', applicationIdMiddleware, rateLimitReadMiddleware, me)

router.use(accessToken)

router.get('/', list)
router.get('/:token', idMiddleware, read)

router.use(bodyMiddleware)

router.patch('/:token', idMiddleware, save)
router.put('/:token', idMiddleware, save)
router.post('/:token', idMiddleware, save)

router.del('/:token', idMiddleware, del)
router.post('/:token/delete', idMiddleware, del)

router.opt(function (ctx: Context): void { })
export default router
