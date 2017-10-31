/* @flow */
import type { Context } from 'koa'
import type Auth from 'models/auth'
import type Token from 'models/token'

export default async function (ctx: Context) {
  let auth: Auth = ctx.state.auth
  let token: Token = ctx.state.token
  await auth.setToken(token).can('read')

  ctx.vmState({
    ...auth.toJSON(),
    cans: {
      save: await auth.can('save'),
      delete: await auth.can('delete'),
      verification: await auth.can('verification'),
    }
  })
}
