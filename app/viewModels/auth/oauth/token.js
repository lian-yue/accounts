/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  const column: string = ctx.params.column
  const token: Token = ctx.state.token
  let userInfo = token.get('state.auth.' + column + '.userInfo')
  if (!userInfo || !userInfo.createdAt || userInfo.createdAt.getTime() < (Date.now() - 1800 * 1000)) {
    if (userInfo) {
      token.set('state.auth.' + column, undefined)
      await token.save()
    }
    userInfo = {}
  }
  ctx.vmState(userInfo)
}
