/* @flow */
import { Types } from 'mongoose'
import Authorize from 'models/authorize'

import type { Context } from 'koa'
import type User from 'models/user'
import type Token from 'models/token'

const ObjectId = Types.ObjectId

export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let canAuthorize = new Authorize({
    _id: '594e210d5cc916fe9dabccdb',
    user,
  })
  canAuthorize.setToken(token).can('list')


  let params = { ...ctx.query }


  let query = {}
  let options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit, 10)
  }


  query.user = user

  if (params.lt_id) {
    try {
      query._id = { $lt: new ObjectId(params.lt_id) }
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  if (params.deleted && await canAuthorize.canBoolean('list', { deletedAt: true })) {
    query.deletedAt = { $exists: true }
  } else {
    query.deletedAt = { $exists: false }
  }


  let authorizes: Authorize[] = await Authorize.find(query, undefined, { limit: options.limit + 1, sort: { _id: -1 } }).populate('application').exec()

  let more = authorizes.length > options.limit
  if (more) {
    authorizes.pop()
  }


  let results = []
  for (let i = 0; i < authorizes.length; i++) {
    let authorize = authorizes[i]
    let result = authorize.toJSON()
    authorize.setToken(token)

    result.cans = {
      delete: await authorize.canBoolean('delete'),
    }
    results.push(result)
  }
  ctx.vmState({ results, more })
}
