/* @flow */
import Authorize from 'models/authorize'

import type { Context } from 'koa'
import type User from 'models/user'

export default async function (ctx: Context, next: () => Promise<void>) {
  let user: User = ctx.state.user
  let authorize: ?Authorize
  if (ctx.params.authorize) {
    try {
      authorize = await Authorize.findById(ctx.params.authorize).exec()
    } catch (e) {
      e.status = 404
      throw e
    }
    ctx.state.authorize = authorize

    if (!authorize) {
      ctx.throw(404, 'notexist', { path: 'auth' })
      return
    }
    if (user && !user.equals(authorize.get('user'))) {
      ctx.throw(404, 'notexist', { path: 'auth' })
    }
  } else {
    delete ctx.state.authorize
  }
  await next()
}
