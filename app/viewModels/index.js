import Router from 'viewModels/router'
import applicationMiddleware from 'viewModels/middlewares/application'
import tokenMiddleware from 'viewModels/middlewares/token'

import user from './user'
import oauth from './oauth'
import auth from './auth'


const router = new Router


router.use('/oauth', oauth)
router.use('/auth', auth)
router.use(user)

export default router

if (module.hot) {
  module.hot.accept()
}
