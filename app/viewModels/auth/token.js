/* @flow */
import Token from 'models/token'
import cookieConfig from 'config/cookie'
import tokenMiddleware from 'viewModels/middlewares/token'

import type { Context } from 'koa'
import type Application from 'models/application'

const accessTokenMiddleware = tokenMiddleware({
  types: ['access'],
  cookie: true,
  auths: ['cors'],
})

export default async function (ctx: Context) {
  let token: ?Token
  let application: void | Application = ctx.state.application
  let params = {
    ...ctx.request.query,
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }
  try {
    token = await accessTokenMiddleware(ctx)
    ctx.state.rateLimit = false
  } catch (e) {
    if (!ctx.query.create) {
      ctx.vmState({})
      return
    }
  }


  if (!token) {
    let scopes = ['**']
    if (application && (typeof params.scopes !== 'undefined' || typeof params.scope !== 'undefined')) {
      scopes = typeof params.scopes !== 'undefined' ? params.scopes : params.scope
      if (!Array.isArray(scopes)) {
        scopes = String(scopes).split(' ').map(scope => scope.trim()).filter(scope => scope)
      }
      for (let i = 0; i < scopes.length; i++) {
        let scope = scopes[i]
        if (!await application.canBoolean('scope', { path: scope })) {
          ctx.throw(400, 'match', { path: scope, code: 'invalid_scope' })
        }
      }
    }


    token = new Token({
      renewal: true,
      scopes,
      application,
    })
  }


  token.updateLog(ctx, false)
  let isNew: boolean = token.isNew
  if (isNew || token.isModified()) {
    await token.save()
    if (!application) {
      ctx.cookies.set('access_token', token.get('id') + token.get('secret'), { ...cookieConfig, expires: token.get('expiredAt'), path: '/', httponly: true })
    }
  }

  ctx.vmState({
    ...token.toJSON(),
    access_token: isNew && application ? token.get('id') + token.get('secret') : undefined,
  })
}
