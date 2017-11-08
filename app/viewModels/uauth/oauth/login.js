/* @flow */
import type { Context } from 'koa'
import type Api from 'models/auth/oauth/api'

export default async function (ctx: Context) {
  const oauth: Api = ctx.state.oauth

  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let redirectUri = String(params.redirect_uri || '/')
  redirectUri = await oauth.getAuthorizeUri({}, { redirectUri })

  ctx.vmState({ redirectUri })
}
