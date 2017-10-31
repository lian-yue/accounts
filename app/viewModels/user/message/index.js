/* @flow */
import Router from 'models/router'
import bodyMiddleware from 'viewModels/middlewares/body'
import messageMiddleware from './middlewares/message'


import list from './list'
import read from './read'
import save from './save'
import del from './delete'

import clear from './clear'


const router = new Router

router.get('/', list)
router.get('/:message', messageMiddleware, read)

router.use(bodyMiddleware)

router.put(['/', '/save'], save)
router.post(['/', '/save'], save)


router.del('/:message', messageMiddleware, del)
router.post('/:message/delete', messageMiddleware, del)

router.post('/clear', clear)

export default router
