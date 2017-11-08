/* @flow */
import User from 'models/user'
import Meta from 'models/meta'
import Message from 'models/message'

import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  await (new Message({
    _id: '594e210d5cc916fe9dabccdb',
    user,
  })).setToken(token).can('clear')


  let date = new Date
  let query = {}

  query.user = user
  query.createdAt = { $lt: date }
  query.deletedAt = { $exists: false }
  query.type = { $in: ['', 'application'] }
  if (!params.all) {
    query.readAt = { $exists: true }
  }

  let result = await Message.updateMany(query, { $set: { deletedAt: date } }, { w: 0 }).exec()

  await Meta.findByIdAndUpdate(user.get('_id'), { $set: { message: 0 } })

  ctx.vmState(result)
}
