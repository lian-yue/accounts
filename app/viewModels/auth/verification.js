/* @flow */
import User from 'models/user'
import Verification from 'models/verification'

import type { Context } from 'koa'
import type Auth from 'models/auth'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let auth: Auth = ctx.state.auth
  let user: ?User = ctx.state.user
  let token: Token = ctx.state.token
  let params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }



  let type: string
  let to: string
  let toType: string
  if (auth) {
    // 删除权限
    await auth.setToken(token).can('delete')
    type = 'auth_delete'
    to = auth.get('value')
    toType = auth.get('column')
  } else {
    type = 'auth_save'
    to = String(params.to || '').trim()
    toType = String(params.to_type || '').trim()
  }


  if (!user) {
    if (auth) {
      user = await User.findById(auth.get('user')).exec()
    } else {
      user = token.get('user')
    }
  }

  if (!user) {
    ctx.throw(403, 'required', { path: 'user' })
    return
  }

  let verification = new Verification({
    token,
    user,
    type,
    toType,
    to,
    nickname: user.get('nickname') || user.get('username'),
    ip: ctx.ip,
  })

  await verification.save()

  ctx.vmState(verification)
}
