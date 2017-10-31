/* @flow */
import Role from 'models/role'

import type { Context } from 'koa'
import type Application from 'models/application'

export default async function (ctx: Context, next: () => Promise<void>) {
  let application: Application = ctx.state.applicationState
  if (ctx.params.role) {
    let role: ?Role
    try {
      role = await Role.findById(ctx.params.role).exec()
    } catch (e) {
      e.state = 404
      throw e
    }
    ctx.state.role = role
    if (!role) {
      ctx.throw(404, 'notexst', { path: 'role' })
      return
    }
    if (application && !application.equals(role.get('application'))) {
      ctx.throw(404, 'notexst', { path: 'role' })
      return
    }
  } else {
    delete ctx.state.role
  }
  await next()
}
