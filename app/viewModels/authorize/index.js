/* @flow */
import Router from 'models/router'

import bodyMiddleware from 'viewModels/middlewares/body'
import tokenMiddleware from 'viewModels/middlewares/token'

import authorizeMiddleware from './middlewares/authorize'


import list from './list'
import read from './read'
import save from './save'
import del from './delete'
import clear from './clear'

// 只有保存 authorize 数据的时候用
const accessToken = tokenMiddleware({
  user: true,
  application: {
    required: true,
    secret: true,
  }
})
const router = new Router


router.get('/', list)
router.get('/:authorize', authorizeMiddleware, read)

router.use(bodyMiddleware)

router.post('/:authorize', accessToken, authorizeMiddleware, save)
router.del('/:authorize', authorizeMiddleware, del)
router.post('/:authorize/delete', authorizeMiddleware, del)

router.post('/:authorize/clear', authorizeMiddleware, clear)
router.post('/clear', authorizeMiddleware, clear)



export default router
