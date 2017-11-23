/* @flow */
import Verification from 'models/verification'

import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let to = String(params.to || '').trim()
  let toType = String(params.toType || params.to_type || '').trim()

  let token: Token = ctx.state.token

  let verification: Verification = new Verification({
    ip: ctx.ip,
    token,
    type: 'user_save',
    toType: toType === 'phone' ? 'sms' : toType,
    to,
  })

  await verification.save()

  ctx.vmState(verification)
}
