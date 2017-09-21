import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import rateLimit from 'viewModels/middlewares/rateLimit'

import authMiddleware from './middlewares/auth'

import list from './list'
import read from './read'
import save from './save'
import del from './delete'
import verification from './verification'





const router = new Router


const rateLimitSave = rateLimit({
  name:'auth_save',
  limit: 20,
  key(ctx) {
    if (ctx.state.auth) {
      return ctx.state.auth.get('user').toString()
    }
    if (ctx.state.user) {
      return ctx.state.user.get('id')
    }
    return false
  }
})

const rateLimitVerification = rateLimit({
  name:'auth_verification',
  limit: 12,
  key(ctx) {
    if (ctx.state.auth) {
      return ctx.state.auth.get('user').toString()
    }
    if (ctx.state.user) {
      return ctx.state.user.get('id')
    }
    return false
  }
}, {
  name:'auth_verification_success',
  limit: 1,
  key(ctx) {
    if (ctx.state.auth) {
      return ctx.state.auth.get('user').toString()
    }
    if (ctx.state.user) {
      return ctx.state.user.get('id')
    }
    return false
  },
  reset: 30,
  success: true,
})


router.get('/', list)
router.get('/:auth', authMiddleware, read)

router.use(body)

router.put(['/', '/save'], rateLimitSave, save)
router.post(['/', '/save'], rateLimitSave, save)
router.post('/verification', rateLimitVerification, verification)

router.use(authMiddleware)

router.patch('/:auth', save)
router.post('/:auth', save)

router.del('/:auth', del)

router.post('/:auth/verification', rateLimitVerification, verification)

export default router
