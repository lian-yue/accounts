/* @flow */
import User from 'models/user'
import tokenMiddleware from 'viewModels/middlewares/token'

import type { Context } from 'koa'

const accessToken = tokenMiddleware({
  user: true,
  required: false,
})

export default async function (ctx: Context, next: () => Promise<void>) {
  if (ctx.params.user) {
    if (ctx.params.user === 'me') {
      if (!ctx.state.token) {
        await accessToken(ctx)
      }
      ctx.state.user = ctx.state.token.get('user')
    } else {
      ctx.state.user = await User.findByAuth(ctx.params.user, ['username', 'id'])
    }
    if (!ctx.state.user) {
      ctx.throw(404, 'notexist', { path: 'user' })
    }
  } else {
    delete ctx.state.user
  }
  await next()
}
