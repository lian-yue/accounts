/* @flow */
import { Types } from 'mongoose'
import Auth from 'models/auth'


const ObjectId = Types.ObjectId

import type { Context } from 'koa'
import type User from 'models/user'
import type Token from 'models/token'

export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')

  let params = { ...ctx.query }
  await (new Auth({
    _id: '594e210d5cc916fe9dabccdb',
    user,
  })).setToken(token).can('list')

  let query = {}
  let options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit, 10)
  }

  if (user) {
    query.user = user
  }

  if (params.column) {
    query.column = String(params.column)
  }

  if (params.value) {
    query.column = String(params.column)
    query.value = String(params.value)
  }

  query.deletedAt = { $exists: params.deleted && tokenUser.get('admin') ? true : false }


  if (params.lt_id) {
    try {
      query._id = { $lt: new ObjectId(params.lt_id) }
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  let auths = await Auth.find(query, undefined, { limit: options.limit + 1, sort: { _id: -1 } }).exec()

  let more = auths.length > query.limit
  if (more) {
    auths.pop()
  }

  let results = []
  for (let i = 0; i < auths.length; i++) {
    let auth = auths[i]
    auth.setToken(token)
    let result = auth.toJSON()
    result.cans = {
      save: await auth.can('save'),
      delete: await auth.can('delete'),
      verification: await auth.can('verification'),
    }
    results.push(result)
  }

  ctx.vmState({ results, more })
}
