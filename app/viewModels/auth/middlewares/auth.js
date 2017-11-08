/* @flow */
import Auth from 'models/auth'

import type { Context } from 'koa'
import type User from 'models/user'
export default async function (ctx: Context, next: () => Promise<void>) {
  let user: User = ctx.state.user
  if (ctx.params.auth) {
    let auth: ?Auth
    try {
      auth = await Auth.findById(ctx.params.auth).exec()
    } catch (e) {
      e.status = 404
      throw e
    }
    ctx.state.auth = auth
    if (!auth) {
      ctx.throw(404, 'notexist', { path: 'auth' })
      return
    }
    if (user && !user.equals(auth.get('user'))) {
      ctx.throw(404, 'notexist', { path: 'auth' })
    }
  } else {
    delete ctx.state.auth
  }
  await next()
}
