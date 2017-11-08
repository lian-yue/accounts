/* @flow */
import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }
  let token: Token = ctx.state.tokenState
  await token.setToken(ctx.state.token).can('save')

  // 区域
  if (typeof params.locale === 'string') {
    token.set('locale', params.locale)
  }

  await token.save()

  ctx.vmState(token)
}
