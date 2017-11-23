/* @flow */
import Token from 'models/token'
import tokenMiddleware from 'viewModels/middlewares/token'

import type { Context } from 'koa'
import type User from 'models/user'

const accessToken = tokenMiddleware({
  required: true,
})

export default async function (ctx: Context, next: () => Promise<void>) {
  let user: User = ctx.state.user
  let token: ?Token
  if (ctx.params.token) {
    if (ctx.params.token === 'me') {
      await accessToken(ctx)
      ctx.state.tokenState = ctx.state.token
    } else {
      try {
        token = await Token.findById(ctx.params.token).exec()
      } catch (e) {
        e.status = 404
        throw e
      }
    }
    ctx.state.tokenState = token
    if (!token) {
      ctx.throw(404, 'notexist', { path: 'token' })
      return
    }
    if (user && !user.equals(token.get('user'))) {
      ctx.throw(404, 'notexist', { path: 'token' })
    }
  } else {
    delete ctx.state.tokenState
  }
  await next()
}
