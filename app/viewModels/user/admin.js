/* @flow */
import Message from 'models/message'

import type { Context } from 'koa'
import type User from 'models/user'
import type Token from 'models/token'

export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let params = {
    ...ctx.request.query,
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let value = ctx.method !== 'delete' && (params.admin || params.value)

  await user.setToken(token).can('admin', { value })

  user.set('admin', value)
  user.set('reason', String(params.reason))
  await user.save()

  let message = new Message({
    user,
    contact: user,
    creator: tokenUser,
    type: 'user_admin',
    admin: value,
    reason: user.get('reason'),
    token,
  })
  await message.save()

  ctx.vmState({})
}
