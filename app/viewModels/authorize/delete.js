/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'
import type Authorize from 'models/authorize'
export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let authorize: Authorize = ctx.state.authorize
  await authorize.setToken(token).can('delete')

  authorize.set('deletedAt', new Date)
  await authorize.save()

  ctx.vmState(authorize, 204)
}
