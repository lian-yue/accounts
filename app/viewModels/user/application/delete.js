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
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let value = ctx.method !== 'delete' && (params.delete || params.value)

  await application.setToken(token).can('delete', { value })


  application.set('reason', String(params.reason || ''))
  application.set('deletedAt', value ? new Date : undefined)
  await application.save()


  let message = new Message({
    user: application.get('creator'),
    contact: application.get('creator'),
    type: 'application_delete',
    creator: tokenUser,
    'delete': value,
    applicationId: application.get('_id'),
    name: application.get('name'),
    readAt: tokenUser.equals(application.get('creator')) ? new Date : undefined,
    reason: application.get('reason'),
    token,
  })
  await message.save()

  ctx.vmState(application, value ? 204 : 200)
}
