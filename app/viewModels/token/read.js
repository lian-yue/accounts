/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let token: Token = ctx.state.tokenState
  await token.setToken(ctx.state.token).can('read')
  ctx.vmState({
    ...token.toJSON(),
    cans: {
      save: await token.canBoolean('save'),
      delete: await token.canBoolean('delete'),
    },
  })
}
