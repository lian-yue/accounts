/* @flow */

import type { Context } from 'koa'
import type Token from 'models/token'
import type Role from 'models/role'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let role: Role = ctx.state.role
  await role.setToken(token).can('read')


  ctx.vmState({
    ...role.toJSON(),
    cans: {
      save: await role.can('save'),
      delete: await role.can('delete'),
    }
  })
}
