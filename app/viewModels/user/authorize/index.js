import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import tokenMiddleware from 'viewModels/middlewares/token'

import id from './middlewares/id'


import list from './list'
import read from './read'
import save from './save'
import del from './delete'
import clear from './clear'


const accessToken = tokenMiddleware({
  types: ['access'],
  user: true,
  application: {
    required: true,
    secret: true,
  }
})
const router = new Router


router.get('/', list)
router.get('/:id', id, read)

router.use(body)

router.post('/:id', accessToken, id, save)
router.del('/:id', id, del)
router.post('/:id/delete', id, del)

router.post('/:id/clear', id, clear)
router.post('/clear', id, clear)



export default router
