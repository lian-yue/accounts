/* @flow */
import Auth from 'models/auth'
import Verification from 'models/verification'


import type User from 'models/user'
import type Token from 'models/token'
import type { Context } from 'koa'
export default async function (ctx: Context) {

  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let id = String(params.id || '')

  let token: Token = ctx.state.token

  if (!id) {
    ctx.throw(404, 'required', { path: 'id' })
  }

  let auth: ?Auth
  try {
    auth = await Auth.findById(id).populate('user').exec()
  } catch (e) {
    e.status = 403
    throw e
  }

  if (!auth || auth.get('deletedAt') || ['email', 'phone'].indexOf(auth.get('column')) === -1) {
    ctx.throw(404, 'notexist', { path: 'id' })
    return
  }

  let user: ?User = auth.get('user')

  // 用户不存在
  if (!user) {
    ctx.throw(404, 'notexist', { path: 'user' })
    return
  }

  let verification = new Verification({
    ip: ctx.ip,
    user,
    token,
    type: 'user_password',
    to: auth.get('value'),
    toType: auth.get('column'),
    nickname: user.get('nickname') || user.get('username'),
  })

  await verification.save()

  ctx.vmState(verification)
}
