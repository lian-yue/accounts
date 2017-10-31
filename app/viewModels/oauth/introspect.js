/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  ctx.vmState({
    ...token.toJSON(),
    active: true,
    client_id: token.get('application').get('id'),
    application_id: token.get('application').get('id'),
  })
}
