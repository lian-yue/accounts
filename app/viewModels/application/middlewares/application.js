/* @flow */
import Application from 'models/application'

import type { Context } from 'koa'
import type User from 'models/user'
export default async function (ctx: Context, next: () => Promise<void>) {
  let user: ?User = ctx.state.user
  if (ctx.params.application) {
    let application: ?Application
    if (/^[0-9a-z]{24}$/.test(ctx.params.application)) {
      application = await Application.findById(ctx.params.application).exec()
    } else {
      application = await Application.findOne({ slug: ctx.params.application }).exec()
    }
    ctx.state.applicationState = application
    if (!application) {
      ctx.throw(404, 'notexist', { path: 'application' })
      return
    }
    if (user && !user.equals(application.get('creator'))) {
      ctx.throw(404, 'notexist', { path: 'application' })
    }
  } else {
    delete ctx.state.applicationState
  }
  await next()
}
