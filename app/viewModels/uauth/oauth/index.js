/* @flow */
import Router from 'models/router'
import bodyMiddleware from 'viewModels/middlewares/body'

import tokenMiddleware from 'viewModels/middlewares/token'
import columnMiddleware from './middlewares/column'



import token from './token'
import login from './login'
import logout from './logout'

import callback from './callback'


import type { Context } from 'koa'

const accessToken = tokenMiddleware({
  auths: ['cors'],
  application: {
    secret: false,
    required: false,
    auths: ['cors'],
  },
})


const router = new Router

router.use(bodyMiddleware, accessToken, columnMiddleware)


router.get('/token', token)
router.post('/login', login)
router.post('/logout', logout)

router.post('/callback', callback)



router.opt(['/token', '/login', '/logout'], function (ctx: Context): void {})
export default router
