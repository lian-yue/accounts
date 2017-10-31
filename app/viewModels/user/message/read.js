/* @flow */
import User from 'models/user'

import type { Context } from 'koa'
import type Token from 'models/token'
import type Message from 'models/message'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let message: Message = ctx.state.message
  await message.setToken(token).can('read')
  message.populate(User.refPopulate('creator'))
  await message.execPopulate()

  let result = message.toJSON()

  if (!message.get('readAt') && tokenUser.equals(message.get('user'))) {
    message.set('readAt', new Date)
    await message.save()
  }

  ctx.vmState({
    ...result,
    cans: {
      delete: await message.canBoolean('delete'),
    }
  })
}
