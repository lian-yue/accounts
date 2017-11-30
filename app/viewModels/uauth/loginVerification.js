/* @flow */
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
