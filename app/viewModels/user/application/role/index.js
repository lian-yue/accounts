import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'


import role from './middlewares/role'
import list from './list'
import read from './read'
import save from './save'
import del from './delete'
import restore from './restore'

const router = new Router


router.get('/', list)
router.get('/:role', role, read)

router.use(body)
router.put(['/', '/save'], save)
router.post(['/', '/save'], save)

router.patch('/:role', role, save)
router.post('/:role', role, save)


router.del('/:role', role, del)
router.post('/:role/delete', role, del)
router.post('/:role/restore', role, restore)

export default router
