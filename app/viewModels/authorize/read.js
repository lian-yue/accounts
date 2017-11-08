/* @flow */

import type { Context } from 'koa'
import type Token from 'models/token'
import type Authorize from 'models/authorize'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let authorize: Authorize = ctx.state.authorize
  await authorize.setToken(token).can('read')
  authorize.populate('application')
  await authorize.execPopulate()

  let result = authorize.toJSON()

  ctx.vmState({
    ...result,
    cans: {
      delete: await authorize.canBoolean('delete'),
    }
  })
}
