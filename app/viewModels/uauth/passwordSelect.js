/* @flow */
import User from 'models/user'
import Auth from 'models/auth'

import type { Context } from 'koa'

export default async function (ctx: Context) {
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let username = String(params.username || '').trim()

  if (!username) {
    ctx.throw(403, 'incorrect', { path: 'username' })
  }

  let user: ?User = await User.findByAuth(username)

  if (!user) {
    ctx.throw(403, 'notexist', { path: 'user' })
    return
  }

  let auths: Auth[] = await Auth.find({
    user,
    column: {
      $in: ['email', 'phone']
    },
    deletedAt: { $exists: false }
  }).exec()

  ctx.vmState({
    ...user.toJSON(),
    auths,
  })
}
