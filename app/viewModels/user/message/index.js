import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'

import id from './middlewares/id'


import list from './list'
import read from './read'
import save from './save'
import del from './delete'

import clear from './clear'


const router = new Router

router.get('/', list)
router.get('/:id', id, read)

router.use(body)

router.put(['/', '/save'], save)
router.post(['/', '/save'], save)


router.del('/:id', id, del)
router.post('/:id/delete', id, del)

router.post('/clear', clear)


export default router
