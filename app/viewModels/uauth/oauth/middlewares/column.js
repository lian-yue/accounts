/* @flow */
import * as oauths from 'models/auth/oauth'
import oauthConfig from 'config/oauth'

import type { Context } from 'koa'
import type Token from 'models/token'
import type Api from 'models/auth/oauth/api'
export default async function (ctx: Context, next: () => Promise<void>) {
  const token: Token = ctx.state.token
  const column = String(ctx.params.column || '')

  ctx.set('Cache-Control', 'no-cache,must-revalidate,max-age=0')
  let OAuth = oauths[column]
  if (!OAuth || !oauthConfig[column]) {
    ctx.throw(403, 'match', { path: 'column' })
  }

  const oauth: Api = new OAuth
  oauth.setKey(token.get('id'))
  oauth.setRedirectUri(ctx.request.protocol + '://' + ctx.request.host + ctx.request.path.replace(/\/[^\/]+\/?$/g, ''))
  ctx.state.oauth = oauth
  await next()
}
