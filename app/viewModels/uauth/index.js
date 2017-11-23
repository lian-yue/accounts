/* @flow */
import Router from 'models/router'

import bodyMiddleware from 'viewModels/middlewares/body'
import tokenMiddleware from 'viewModels/middlewares/token'
import rateLimitMiddleware from 'viewModels/middlewares/rateLimit'


import oauth from './oauth'


import exists from './exists'
import login from './login'
import loginVerification from './loginVerification'

import create from './create'
import createVerification from './createVerification'


import password from './password'
import passwordSelect from './passwordSelect'
import passwordVerification from './passwordVerification'

import type { Context } from 'koa'

const router = new Router



const accessTokenMiddleware = tokenMiddleware({
  auths: ['cors'],
  user: false,
  application: {
    secret: false,
    required: false,
    auths: ['cors'],
  },
})


const rateLimitExistsMiddleware = rateLimitMiddleware({
  name: 'uauth_exists',
  ip: true,
  limit: 60,
})

const rateLimitLoginMiddleware = rateLimitMiddleware({
  name: 'uauth_login',
  ip: true,
  limit: 30,
  success: false,
}, {
  name: 'uauth_login',
  token: true,
  limit: 15,
}, {
  name: 'uauth_login',
  body: {
    username(value) {
      return String(value).toLocaleLowerCase().trim()
    }
  },
  limit: 30,
})



const rateLimitLoginVerificationMiddleware = rateLimitMiddleware({
  name: 'uauth_login_verification',
  ip: true,
  limit: 12,
  success: true,
}, {
  name: 'uauth_login_verification',
  token: true,
  limit: 6,
  success: true,
}, {
  name: 'uauth_login_verification',
  body: {
    to(value) {
      return String(value).trim().toLocaleLowerCase()
    },
  },
  limit: 1,
  reset: 30,
  success: true,
})


const rateLimitCreateMiddleware = rateLimitMiddleware({
  name: 'uauth_create',
  ip: true,
  limit: 120,
}, {
  name: 'uauth_create',
  token: true,
  limit: 60,
}, {
  name: 'uauth_create',
  ip: true,
  limit: 2,
  success: true,
  message: '当前 IP 注册过于频繁请{TIME}后重试'
}, {
  name: 'uauth_create',
  token: true,
  limit: 1,
  success: true,
  message: '您已经注册过账号了'
})




const rateLimitCreateVerificationMiddleware = rateLimitMiddleware({
  name: 'uauth_create_verification',
  ip: true,
  limit: 12,
  success: true,
}, {
  name: 'uauth_create_verification',
  token: true,
  limit: 6,
  success: true,
}, {
  name: 'uauth_create_verification',
  body: {
    to(value) {
      return String(value).trim().toLocaleLowerCase()
    }
  },
  limit: 1,
  reset: 30,
  success: true,
})



const rateLimitPasswordMiddleware = rateLimitMiddleware({
  name: 'uauth_password',
  ip: true,
  limit: 15,
}, {
  name: 'uauth_password',
  body: {
    id(value) {
      return String(value).trim().toLocaleLowerCase()
    }
  },
  limit: 30,
})




const rateLimitPasswordSelectMiddleware = rateLimitMiddleware({
  name: 'uauth_password_select',
  ip: true,
  limit: 15,
  success: true,
})



const rateLimitPasswordVerificationMiddleware = rateLimitMiddleware({
  name: 'uauth_password_verification',
  ip: true,
  limit: 12,
  success: true,
}, {
  name: 'uauth_password_verification',
  token: true,
  limit: 6,
  success: true,
}, {
  name: 'uauth_password_verification',
  body: {
    to(value) {
      return String(value).trim().toLocaleLowerCase()
    }
  },
  limit: 1,
  success: true,
})



router.use('/oauth/:column', oauth)

router.use(bodyMiddleware, accessTokenMiddleware)

router.get('/exists', rateLimitExistsMiddleware, exists)

router.post(['/', '/login'], rateLimitLoginMiddleware, login)
router.post('/loginVerification', rateLimitLoginVerificationMiddleware, loginVerification)


router.put('/create', rateLimitCreateMiddleware, create)
router.post('/create', rateLimitCreateMiddleware, create)
router.post('/createVerification', rateLimitCreateVerificationMiddleware, createVerification)


router.post('/password', rateLimitPasswordMiddleware, password)
router.post('/passwordSelect', rateLimitPasswordSelectMiddleware, passwordSelect)
router.post('/passwordVerification', rateLimitPasswordVerificationMiddleware, passwordVerification)

router.opt(['/exists', '/login', '/loginVerification', '/create', '/createVerification', '/reset', '/passwordSelect', '/passwordVerification'], function (ctx: Context): void { })
export default router
