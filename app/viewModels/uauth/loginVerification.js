/* @flow */
import User from 'models/user'
import Auth from 'models/auth'
import Verification from 'models/verification'
import { matchEmail, matchMobilePhone } from 'models/utils'

import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let token: Token = ctx.state.token
  let to = String(params.to || '').trim()
  let toType = String(params.toType || params.to_type || '').trim()
  if (toType) {
    // not empty
  } else if (matchEmail(to)) {
    toType = 'email'
  } else if (matchMobilePhone(to)) {
    toType = 'phone'
  } else {
    let user = await User.findByAuth(params.to || params.username, ['id', 'username'])
    if (!user) {
      ctx.throw(404, 'notexist', { path: 'username' })
      return
    }
    let auth = await Auth.findOne({ user, column: 'phone', deletedAt: { $exists: false } }).exec()
    if (!auth) {
      auth = await Auth.findOne({ user, column: 'email', deletedAt: { $exists: false } }).exec()
    }
    if (!auth) {
      ctx.throw(404, 'notexist', { path: 'auth' })
      return
    }
    to = auth.get('value')
    toType = auth.get('column')
  }

  let verification: Verification = new Verification({
    ip: ctx.ip,
    token,
    type: 'user_login',
    to,
    toType,
  })

  await verification.save()

  ctx.vmState(verification)
}
