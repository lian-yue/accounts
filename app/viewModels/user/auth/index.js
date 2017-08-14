import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import rateLimit from 'viewModels/middlewares/rateLimit'

import id from './middlewares/id'

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
router.get('/:id', id, read)

router.use(body)

router.put(['/', '/save'], rateLimitSave, save)
router.post(['/', '/save'], rateLimitSave, save)
router.post('/verification', rateLimitVerification, verification)

router.use(id)

router.patch('/:id', save)
router.post('/:id', save)

router.del('/:id', del)

router.post('/:id/verification', rateLimitVerification, verification)

export default router
