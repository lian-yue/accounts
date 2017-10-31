/* @flow */
import User from 'models/user'
import Token from 'models/token'
import Message from 'models/message'
import Authorize from 'models/authorize'
import Application from 'models/application'

import type { Context } from 'koa'

export default async function (ctx: Context) {
  let params = {
    ...ctx.request.query,
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }
  let token: Token = ctx.state.token
  let application: Application = ctx.state.application
  let user: User = token.get('user')
  let scopes: string[] = String(params.scopes || params.scope || '').split(' ').map(scope => scope.trim()).filter(scope => scope)
  let response_type = String(params.response_type || '')
  let redirect_uri = String(params.redirect_uri || '')
  // 权限判断
  for (let i = 0; i < scopes.length; i++) {
    let scope = scopes[i]
    if (!await application.canBoolean('scope', { path: scope })) {
      ctx.throw(400, 'match', { path: 'scope', value: scope, code: 'invalid_scope' })
    }
  }

  if (response_type !== 'code' && response_type !== 'token') {
    ctx.throw(400, 'incorrect', { path: 'response_type', value: response_type, code: 'unsupported_response_type' })
  }

  if (response_type === 'token' && !application.get('auths').get('implicit')) {
    ctx.throw(400, 'incorrect', { path: 'response_type', value: response_type, code: 'unsupported_response_type' })
  }

  if (!params.state) {
    ctx.throw(400, 'required', { path: 'state', code: 'invalid_request' })
  }

  if (typeof redirect_uri !== 'string' || application.get('redirectUris').indexOf(redirect_uri) === -1) {
    ctx.throw(403, 'match', { path: 'redirect_uri', value: redirect_uri, code: 'error_uri' })
  }

  await user.setToken(token).can('oauth')

  let authorize = await Authorize.findOneCreate(user, application)

  let message = new Message({
    user,
    application,
    oauth: true,
    type: 'user_login',
    token,
  })
  await message.save()

  if (params.response_type === 'token') {
    let accessToken = new Token({
      user,
      authorize,
      application,
      type: 'access',
      scopes,
    })
    accessToken.updateLog(ctx, false)
    await accessToken.save()
    ctx.vmState({
      ...accessToken.toJSON(),
      access_token: accessToken.get('token') + accessToken.get('secret')
    })
    return
  }

  let codeToken = new Token({
    user,
    authorize,
    application,
    type: 'code',
    state: {
      redirectUri: params.redirect_uri,
    },
    scopes,
  })
  codeToken.updateLog(ctx, false)
  await codeToken.save()


  ctx.vmState({
    ...codeToken.toJSON(),
    code: codeToken.get('token') + codeToken.get('secret')
  })
}
