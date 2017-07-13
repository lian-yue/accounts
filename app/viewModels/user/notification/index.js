import Router from 'viewModels/router'

import body from 'viewModels/middlewares/body'
import applicationMiddleware from 'viewModels/middlewares/application'

import id from './middlewares/id'


import list from './list'
import read from './read'
import save from './save'
import del from './delete'

import clear from './clear'


const applicationSecret = applicationMiddleware({})

router.get('/', list)
router.get('/:id', id, read)

router.use(body)

router.put(['/', '/save'], applicationSecret, save)
router.post(['/', '/save'], applicationSecret, save)


router.del('/:id', id, del)
router.post('/:id/delete', id, del)

router.post('/clear', clear)

const router = new Router


export default router
