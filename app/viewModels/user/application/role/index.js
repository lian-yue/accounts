/* @flow */
import Router from 'models/router'

import bodyMiddleware from 'viewModels/middlewares/body'


import roleMiddleware from './middlewares/role'
import list from './list'
import read from './read'
import save from './save'
import del from './delete'

const router = new Router


router.get('/', list)
router.get('/:role', roleMiddleware, read)

router.use(bodyMiddleware)
router.put(['/', '/save'], save)
router.post(['/', '/save'], save)

router.patch('/:role', roleMiddleware, save)
router.post('/:role', roleMiddleware, save)


router.del('/:role', roleMiddleware, del)
router.post('/:role/delete', roleMiddleware, del)

export default router
