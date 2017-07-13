import Router from 'viewModels/router'

import id from './middlewares/id'
import index from './index'
import read from './read'
import editor from './editor'
import status from './status'
import del from './delete'
import restore from './restore'


const router = new Router


router.get('/', index)
router.get('/:id', id, read)

router.put('/', editor)
router.put('/create', editor)
router.post('/', editor)
router.post('/create', editor)

router.patch('/:id', id, editor)
router.post('/:id', id, editor)


router.del('/:id', id, del)
router.post('/:id/delete', id, del)
router.post('/:id/restore', id, restore)

export default router
