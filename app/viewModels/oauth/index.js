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

const applicationId = applicationMiddleware({
  secret: false,
})

const introspectApplicationId = applicationMiddleware({
  secret: false,
  required: false,
})


const introspectToken = tokenMiddleware({
  name: 'token',
  types: ['refresh', 'access'],
  user: true,
  authorize: true,
  application: true,
})


const revokeToken = tokenMiddleware({
  name: 'token',
  types: ['refresh', 'access'],
  user: true,
  authorize: true,
  application: true,
  log: true,
})



const authorizeApplicationId = applicationMiddleware({
  secret: false,
  cors: false,
})

const authorizeToken = tokenMiddleware({
  types: ['access'],
  user: true,
  authorize: false,
  application: false,
  strict: false,
  cors: false,
  log: false,
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

router.get('/introspect', introspectApplicationId, introspectToken, introspect)
router.post('/introspect', introspectApplicationId, introspectToken, introspect)


router.post('/token', applicationSecret, token)
router.post('/revoke', applicationSecret, revokeToken, revoke)

router.post('/authorize', authorizeApplicationId, authorizeToken, rateLimitAuthorize, authorize)

router.opt(['/introspect', '/token', '/revoke'], applicationId)
export default router
