/* @flow */
import Router from 'models/router'

import oauth from './oauth'
import auth from './auth'
import user from './user'

const router = new Router

router.use('/oauth', oauth)
router.use('/auth', auth)
router.use(user)

export default router
