import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'

import id from './middlewares/id'
import list from './list'
import read from './read'
import save from './save'
import status from './status'
import del from './delete'
import restore from './restore'

import role from './role'


const router = new Router


router.get('/', list)
router.get('/:id', id, read)

router.use('/:id/role', id, role)

router.use(body)
router.put(['/', '/save'], save)
router.post(['/', '/save'], save)

router.patch('/:id', id, save)
router.post('/:id', id, save)


router.del('/:id', id, del)
router.post('/:id/status', id, status)
router.post('/:id/delete', id, del)
router.post('/:id/restore', id, restore)

export default router
