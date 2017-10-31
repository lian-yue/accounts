/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'

export default async function (ctx: Context) {
  const token: Token = ctx.state.token
  const column: string = ctx.params.column

  token.set('state.auth.' + column, undefined)
  await token.save()

  ctx.vmState({}, 204)
}
