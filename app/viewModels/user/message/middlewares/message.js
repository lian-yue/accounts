/* @flow */
import Message from 'models/message'

import type { Context } from 'koa'
import type User from 'models/user'

export default async function (ctx: Context, next: () => Promise<void>) {
  let user: ?User = ctx.state.user
  let message: ?Message
  if (ctx.params.message) {
    try {
      message = await Message.findById(ctx.params.message).exec()
    } catch (e) {
      e.status = 404
      throw e
    }
    ctx.state.message = message
    if (!message) {
      ctx.throw(404, 'notexist', { path: 'message' })
      return
    }
    if (user && !user.equals(message.get('user'))) {
      ctx.throw(404, 'notexist', { path: 'message' })
      return
    }
  } else {
    delete ctx.state.message
  }
  await next()
}
