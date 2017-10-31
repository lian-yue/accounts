/* @flow */
import User from 'models/user'

import type { Context } from 'koa'
import type Token from 'models/token'
import type Application from 'models/application'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let application: Application = ctx.state.applicationState
  await application.setToken(token).can('read')
  application.populate(User.refPopulate('creator'))
  await application.execPopulate()

  let result = application.toJSON()
  if (ctx.query.cans || ctx.query.cans === undefined) {
    result.cans = {
      save: await application.canBoolean('save'),
      status: await application.canBoolean('status'),
      delete: await application.canBoolean('delete'),
      scope: await application.canBoolean('scope'),
      auths_password: await application.canBoolean('save', { auths: { password: true } }),
      auths_implicit: await application.canBoolean('save', { auths: { implicit: true } }),
      auths_cors: await application.canBoolean('save', { auths: { cors: true } }),
    }
  } else {
    result.cans = {}
  }
  ctx.vmState(result)
}
