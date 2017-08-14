import Router from 'viewModels/router'
import body from 'viewModels/middlewares/body'

import tokenMiddleware from 'viewModels/middlewares/token'
import rateLimit from 'viewModels/middlewares/rateLimit'
import column from './middlewares/column'



import login from './login'
import logout from './logout'

import callback from './callback'
import token from './token'


const accessToken = tokenMiddleware({
  types: ['access'],
  auths: ['cors'],
  application: {
    secret: false,
    required: false,
    strict: false,
    auths: ['cors'],
  },
})


const router = new Router

router.use(body, accessToken, column)

router.get('/login', login)
router.post('/logout', logout)

router.get('/callback', callback)
router.get('/token', token)



router.opt(['/token', '/login', '/logout'], ctx => {})
export default router
