/* @flow */
import Authorize from 'models/authorize'
import Token from 'models/token'

import type { Context } from 'koa'
import type User from 'models/user'

export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let authorize: ?Authorize = ctx.state.authorize
  if (authorize) {
    await authorize.setToken(token).can('clear')
  } else {
    await (new Authorize({
      _id: '594e210d5cc916fe9dabccdb',
      user,
    })).setToken(token).can('clear')
  }

  let query = {}
  let date = new Date
  query.user = user
  if (authorize) {
    query.authorize = authorize
  }
  query._id = { $ne: token.get('_id') }
  query.createdAt = { $lt: date }
  query.deletedAt = { $exists: false }


  // 删除当前 token
  if (user.equals(token.get('user')) && (!authorize || authorize.equals(token.get('authorize')))) {
    token.set('deletedAt', date)
    await token.save()
  }

  await Token.updateMany(query, { $set: { deletedAt: date } }, { w: 0 }).exec()

  ctx.vmState({})
}
