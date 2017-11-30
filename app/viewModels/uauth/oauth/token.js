/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  const column: string = ctx.params.column
  const token: Token = ctx.state.token
  let data = token.get('state.auth.' + column)
  if (!data || !data.userInfo || !data.createdAt || data.createdAt.getTime() < (Date.now() - 1800 * 1000)) {
    if (data) {
      token.set('state.auth.' + column, undefined)
      await token.save()
    }
    data = {}
  }
  ctx.vmState(data.userInfo || {})
}
