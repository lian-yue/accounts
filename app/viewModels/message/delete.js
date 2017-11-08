/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'
import type Message from 'models/message'
export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let message: Message = ctx.state.message
  await message.setToken(token).can('delete')

  message.set('deletedAt', new Date)
  await message.save()

  ctx.vmState(message, 204)
}
