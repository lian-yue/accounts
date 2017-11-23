/* @flow */
import { Types } from 'mongoose'
import Token from 'models/token'
import User from 'models/user'

import type { Context } from 'koa'

const ObjectId = Types.ObjectId

export default async function (ctx: Context) {
  let user: ?User = this.state.user
  let meToken: Token = this.state.token
  let canToken: Token = new Token({
    _id: '594e210d5cc916fe9dabccdb',
    user: user ? user : undefined,
  })
  canToken.setToken(meToken).can('list')

  let params = { ...ctx.query }

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


  if (params.lt_id) {
    try {
      query._id = { $lt: new ObjectId(params.lt_id) }
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  if (params.application) {
    try {
      query.application = new ObjectId(params.application)
    } catch (e) {
      e.status = 403
      throw e
    }
  }


  if (params.deleted && await canToken.canBoolean('list', { deletedAt: true })) {
    query.deletedAt = { $exists: true }
  } else {
    query.deletedAt = { $exists: false }
  }


  let tokens: Token[] = await Token.find(query, undefined, { limit: options.limit + 1, sort: { _id: -1 } }).populate(User.refPopulate('user')).populate('token').exec()

  let more = tokens.length > options.limit
  if (more) {
    tokens.pop()
  }

  let results = []
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]
    token.setToken(meToken)
    let result: Object = token.toJSON()
    result.cans = {
      read: await token.canBoolean('read'),
      save: await token.canBoolean('save'),
      delete: await token.canBoolean('delete'),
    }
    results.push(i)
  }
  ctx.vmState({ results, more })
}
