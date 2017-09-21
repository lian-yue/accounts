import Router from 'models/router'

import oauth from './oauth'
// import user from './user'
// import auth from './auth'


const router = new Router


router.use('/oauth', oauth)
// router.use('/auth', auth)
// router.use(user)

export default router
