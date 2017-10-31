/* @flow */
import Router from 'models/router'

import body from 'viewModels/middlewares/body'
import tokenMiddleware from 'viewModels/middlewares/token'

import applicationMiddleware from './middlewares/application'
import list from './list'
import read from './read'
import save from './save'
import status from './status'
import del from './delete'

import role from './role'


import type { Context } from 'koa'

const accessToken = tokenMiddleware({
  types: ['access'],
  user: true,
  application: {
    required: false,
    secret: false,
  }
})

const readAccessToken = tokenMiddleware({
  required: false,
  types: ['access'],
  application: {
    required: false,
    secret: false,
  }
})


const router = new Router


router.get('/', accessToken, list)
router.get('/:application', readAccessToken, applicationMiddleware, read)

router.get(accessToken)
router.opt(function (ctx: Context): void {})

router.use('/:application/role', applicationMiddleware, role)

router.use(body)
router.put(['/', '/save'], save)
router.post(['/', '/save'], save)

router.patch('/:application', applicationMiddleware, save)
router.post('/:application', applicationMiddleware, save)


router.del('/:application', applicationMiddleware, del)
router.post('/:application/status', applicationMiddleware, status)
router.post('/:application/delete', applicationMiddleware, del)

export default router
