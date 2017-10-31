/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  token.set('deletedAt', new Date)
  await token.save()
  ctx.vmState(token, 204)
}
