/* @flow */
import cookieConfig from 'config/cookie'
import type { Context } from 'koa'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  token.set('deletedAt', new Date)
  await token.save()
  if (!token.get('application')) {
    ctx.cookies.set('access_token', 'deleted', { ...cookieConfig, expires: new Date('1970-02-01'), path: '/', httpOnly: true })
  }
  ctx.vmState(token, 204)
}
