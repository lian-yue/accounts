/* @flow */
import Token from 'models/token'
import cookieConfig from 'config/cookie'
import tokenMiddleware from 'viewModels/middlewares/token'

import type { Context } from 'koa'
import type Application from 'models/application'

const accessTokenMiddleware = tokenMiddleware({
  cookie: true,
  auths: ['cors'],
})

export default async function (ctx: Context) {
  let token: ?Token
  let application: void | Application = ctx.state.application
  let params = {
    ...ctx.request.query,
  }
  try {
    token = await accessTokenMiddleware(ctx)
    ctx.state.rateLimit = false
  } catch (e) {
    if (!ctx.query.save) {
      ctx.state.rateLimit = false
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
    let renewal = Number(params.renewal || (1000 * 86400 * 30))
    if (isNaN(renewal) || renewal < 1 || renewal > 1000 * 86400 * 30) {
      renewal = 0
    }


    token = new Token({
      renewal,
      scopes,
      application,
    })
  }

  token.setToken(token)


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
    cans: {
      delete: await token.canBoolean('delete'),
      save: await token.canBoolean('save'),
    }
  })
}
