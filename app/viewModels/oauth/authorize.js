import Token from 'models/token'
import Message from 'models/message'
import Authorize from 'models/authorize'


export default async function (ctx) {
  var params = {...ctx.request.query,...ctx.request.body}
  var token = ctx.state.token
  var application = ctx.state.application
  var user = token.get('user')
  var scopes = String(params.scopes || params.scope || '').split(' ').map(scope => scope.trim()).filter(scope => scope)

  // 权限判断
  for (let i = 0; i < scopes.length; i++) {
    let scope = scopes[i]
    if (!application.canScope(scope)) {
      ctx.throw(`"scope.${scope}" no permission`, 400, {code: 'invalid_scope'})
    }
  }

  if (params.response_type != 'code' && params.response_type != 'token') {
    ctx.throw('"response_type" not supported', 400, {code: 'unsupported_response_type'})
  }

  if (params.response_type == 'token' && !application.get('auths').get('implicit')) {
    ctx.throw('The authorization mode is not allowed', 400, {code: 'unsupported_response_type'})
  }

  if (!params.state) {
    ctx.throw('"state" parameter is required', 400, {code:'invalid_request'})
  }

  if (typeof params.redirect_uri != 'string' || application.get('redirectUris').indexOf(params.redirect_uri) == -1) {
    ctx.throw('"redirect_uri" does not match', 403, {code: 'error_uri'})
  }

  if (!await user.setToken(token).can('oauth')) {
    ctx.throw(`Your account is blocked because of "${user.get('reason')}"`, 403, {code: 'invalid_grant', black: true})
  }

  var authorize = await Authorize.findOneCreate(user, application)

  var message = new Message({
    user,
    application,
    readOnly: true,
    oauth: true,
    type: 'auth_login',
    token,
  })
  await message.save()

  if (responseType == 'token') {
    var accessToken = new Token({
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

  var codeToken = new Token({
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
