/* @flow */
import Message from 'models/message'

import type { Context } from 'koa'
import type User from 'models/user'
import type Token from 'models/token'
import type Application from 'models/application'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let application: Application = ctx.state.applicationState
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }
  await application.setToken(token).can('status')

  application.set('reason', String(params.reason || ''))
  application.set('status', String(params.status || 'approved'))
  await application.save()

  let message = new Message({
    user: application.get('creator'),
    contact: application.get('creator'),
    type: 'application_status',
    creator: tokenUser,
    applicationId: application.get('_id'),
    name: application.get('name'),
    readAt: tokenUser.equals(application.get('creator')) ? new Date : undefined,
    status: application.get('status'),
    reason: application.get('reason'),
    token,
  })
  await message.save()

  ctx.vmState({})
}
