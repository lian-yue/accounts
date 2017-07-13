import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import applicationMiddleware from 'viewModels/middlewares/application'
import tokenMiddleware from 'viewModels/middlewares/token'
import rateLimit from 'viewModels/middlewares/rateLimit'


import token from './token'
import exists from './exists'

import login from './login'
import loginVerification from './loginVerification'

import logout from './logout'

import create from './create'
import createVerification from './createVerification'

import password from './password'
import passwordSelect from './passwordSelect'
import passwordVerification from './passwordVerification'

const router = new Router;

const applicationId = applicationMiddleware({
  secret: false,
  required: false,
  strict: false,
})

const accessToken = tokenMiddleware({
  types: ['access'],
  user: false,
  log: false,
})

const logoutAccessToken = tokenMiddleware({
  types: ['access'],
  black: false,
  log: false,
})

const rateLimitToken = rateLimit({
  name:'auth_token',
  ip: true,
  limit: 20,
})

const rateLimitExists = rateLimit({
  name:'auth_exists',
  ip: true,
  limit: 60,
})



const rateLimitLogin = rateLimit({
  name:'auth_login',
  ip: true,
  limit: 30,
  success: false,
}, {
  name:'auth_login',
  token: true,
  limit: 15,
}, {
  name:'auth_login',
  body: {
    username:[value => String(value).toLocaleLowerCase().trim()]
  },
  limit: 30,
})



const rateLimitLoginVerification = rateLimit({
  name:'auth_login_verification',
  ip: true,
  limit: 12,
  success: true,
}, {
  name:'auth_login_verification',
  token: true,
  limit: 6,
  success: true,
}, {
  name:'auth_login_verification',
  body: {
    to: [value => String(value).trim().toLocaleLowerCase()],
  },
  limit: 1,
  reset: 60,
  success: true,
})


const rateLimitCreate = rateLimit({
  name:'auth_create',
  ip: true,
  limit: 120,
}, {
  name:'auth_create',
  token: true,
  limit: 60,
}, {
  name:'auth_create',
  ip: true,
  limit: 2,
  success: true,
  message: '当前 IP 注册过于频繁请{TIME}后重试'
}, {
  name:'auth_create',
  token: true,
  limit: 1,
  success: true,
  message: '您已经注册过账号了'
})







const rateLimitCreateVerification = rateLimit({
  name:'auth_create_verification',
  ip: true,
  limit: 12,
  success: true,
}, {
  name:'auth_create_verification',
  token: true,
  limit: 6,
  success: true,
}, {
  name:'auth_create_verification',
  body: {
    to: [value => String(value).trim().toLocaleLowerCase()],
  },
  limit: 1,
  reset: 60,
  success: true,
})






const rateLimitPassword = rateLimit({
  name:'auth_password',
  ip: true,
  limit: 15,
}, {
  key:'auth_password',
  body: {
    id: [id => String(id).trim().toLocaleLowerCase()]
  },
  limit: 30,
})




const rateLimitPasswordSelect = rateLimit({
  key:'auth_password_select',
  ip: true,
  limit: 15,
  success: true,
})



const rateLimitPasswordVerification = rateLimit({
  key:'auth_password_verification',
  ip: true,
  limit: 12,
  success: true,
}, {
  key:'auth_password_verification',
  token: true,
  limit: 6,
  success: true,
}, {
  key:'auth_password_verification',
  body: {
    to: [value => String(value).trim().toLocaleLowerCase()],
  },
  limit: 1,
  success: true,
})

const authCros = function(ctx, next) {
  var application = ctx.state.application
  if (!application && ctx.state.token) {
    application = ctx.state.token.get('application')
  }
  if (application && !application.get('auths').get('cors')) {
    ctx.throw('The authorization mode is not allowed', 400, {code: 'unsupported_response_type'})
  }
  return next()
}

router.get('/token', applicationId, authCros, rateLimitToken, token)
router.opt('/token', applicationId)


router.post('/logout', body, applicationId, logoutAccessToken, authCros, logout)
router.opt('/logout', applicationId, logoutAccessToken)



router.use(body, applicationId, accessToken, authCros)

router.get('/exists', rateLimitExists, exists)

router.post(['/', '/login'], rateLimitLogin, login)
router.post('/loginVerification', rateLimitLoginVerification, loginVerification)


router.put('/create', rateLimitCreate, create)
router.post('/create', rateLimitCreate, create)
router.post('/createVerification', rateLimitCreateVerification, createVerification)

router.post('/password', rateLimitPassword, password)
router.post('/passwordSelect', rateLimitPasswordSelect, passwordSelect)
router.post('/passwordVerification', rateLimitPasswordVerification, passwordVerification)

router.opt(['/exists', '/login', '/loginVerification', '/create', '/createVerification', '/password', '/passwordSelect', '/passwordVerification'], ctx => {})

export default router
