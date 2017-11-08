/* @flow */
import Message from 'models/message'

import type { Context } from 'koa'
import type User from 'models/user'
import type Role from 'models/role'
import type Token from 'models/token'
import type Application from 'models/application'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let role: Role = ctx.state.role
  let application: Application = ctx.state.applicationState
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let value = ctx.method !== 'delete' && (params.delete || params.value)

  await role.setToken(token).can('delete', { value })

  role.set('deletedAt', value ? new Date : undefined)
  await role.save()

  let message = new Message({
    user: application.get('creator'),
    contact: application.get('creator'),
    type: 'role_delete',
    value: value,
    roleId: role.get('_id'),
    name: role.get('name'),
    creator: tokenUser,
    readAt: tokenUser.equals(application.get('creator')) ? new Date : undefined,
    token,
  })

  await message.save()

  ctx.vmState(role, value ? 204 : 200)
}
