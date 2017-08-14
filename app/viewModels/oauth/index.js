import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import applicationMiddleware from 'viewModels/middlewares/application'
import tokenMiddleware from 'viewModels/middlewares/token'
import rateLimit from 'viewModels/middlewares/rateLimit'


import token from './token'
import introspect from './introspect'
import revoke from './revoke'
import authorize from './authorize'


const applicationSecret = applicationMiddleware({
})


const introspectToken = tokenMiddleware({
  name: 'token',
  types: ['refresh', 'access'],
  user: true,
  log: false,
  authorize: true,
  application: {
    secret: false,
    required: false,
  },
})


const revokeToken = tokenMiddleware({
  name: 'token',
  types: ['refresh', 'access'],
  user: true,
  authorize: true,
  application: {},
  log: true,
})



const authorizeToken = tokenMiddleware({
  types: ['access'],
  user: true,
  authorize: false,
  application: {
    secret: false,
    cors: false,
  },
  strict: false,
  cors: false,
})







const rateLimitAuthorize = rateLimit({
  name:'oauth_authorize',
  ip: true,
  limit: 60,
}, {
  name:'oauth_authorize',
  limit: 60,
  key(ctx) {
    return ctx.state.token.get('id')
  }
})

const router = new Router

router.use(body)

router.get('/introspect', introspectToken, introspect)
router.post('/introspect', introspectToken, introspect)


router.post('/token', applicationSecret, token)
router.post('/revoke', revokeToken, revoke)

router.post('/authorize', authorizeToken, rateLimitAuthorize, authorize)

router.opt(['/introspect', '/token', '/revoke'], applicationSecret)
export default router
