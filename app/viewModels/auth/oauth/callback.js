/* @flow */
import type { Context } from 'koa'
import type Api from 'models/auth/oauth/api'
import type Token from 'models/token'

export default async function (ctx: Context) {
  const token: Token = ctx.state.token
  const oauth: Api = ctx.state.oauth
  const column: string = ctx.params.column

  let params = {
    ...ctx.request.query,
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }


  let authorizeData = await oauth.getAuthorizeData(params)
  let redirectUri = authorizeData && authorizeData.redirectUri ? authorizeData.redirectUri : '/'

  // 取消认证
  if (!oauth.isAuthorize(params)) {
    ctx.throw(403, 'cancel', { path: 'auth', redirectUri })
  }

  if (!authorizeData) {
    ctx.throw(403, 'timeout', { path: 'auth', redirectUri })
  }


  let accessToken: Object
  let userInfo: Object
  // 认证
  try {
    accessToken = await oauth.getAccessTokenByAuthorizationCode(params)
    userInfo = await oauth.getUserInfo()
  } catch (e) {
    e.redirectUri = redirectUri
    e.status = e.status || e.code
    e.token = true
    throw e
  }


  token.set('state.auth.' + column, { accessToken, userInfo, createdAt: new Date })
  await token.save()

  // 成功重定向
  ctx.vmState({
    ...userInfo,
    redirectUri,
  })
}
