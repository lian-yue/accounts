/* @flow */
import Message from 'models/message'

import type { Context } from 'koa'
import type User from 'models/user'
import type Token from 'models/token'

export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: Token = token.get('user')
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  delete params.cans
  delete params.contact
  delete params.createdAt
  delete params.deletedAt

  delete params.application
  delete params.userAgent
  delete params.ip

  for (let key in params) {
    let value = params[key]
    if (!key || key.toLowerCase() === 'id' || /^[a-z][0-9a-zA-Z]*$/.test(key) || value === null || value === undefined || typeof value === 'object') {
      delete params[key]
      continue
    }
    params[key] = String(value)
  }

  let message = new Message({
    ...params,
    user,
    creator: tokenUser,
    readAt: params.readAt ? new Date : undefined,
    token,
  })
  await message.setToken(token).can('save')
  await message.save()

  ctx.vmState(message)
}
