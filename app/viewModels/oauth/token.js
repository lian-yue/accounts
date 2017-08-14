import User from 'models/user'
import Token from 'models/token'
import Message from 'models/message'
import Application from 'models/application'
import rateLimit from 'viewModels/middlewares/rateLimit'
import tokenMiddleware from 'viewModels/middlewares/token'

const refreshTokenMiddleware = tokenMiddleware({
  types: ['refresh'],
  user: true,
  authorize: true,
  application: {},
  log: true,
})

const codeTokenMiddleware = tokenMiddleware({
  name: 'code',
  types: ['code'],
  user: true,
  log: false,
  authorize: true,
  application: {},
})

const passwordRateLimit = rateLimit({
  name: 'token-password-ip',
  limit: 10,
  key(ctx) {
    return Application.forwardIp(ctx) || false
  }
}, {
  name: 'token-password-username',
  limit: 15,
  key(ctx) {
    var username = ctx.body.username || ctx.query.username
    return username.trim().toLocaleLowerCase() || false
  }
})



export default async function (ctx) {
  var token
  var application = ctx.state.application
  var params = {...ctx.request.body, ...ctx.request.query}


  if (params.token_type && String(params.token_type).toLocaleLowerCase() != 'bearer') {
    ctx.throw('"token_type" can only be "bearer" ', 403, {code: 'invalid_grant'})
  }

  var scopes = params.scope || params.scopes
  if (typeof scopes != 'undefined' && !Array.isArray(scopes)) {
    scopes = String(scopes).split(' ').map(scope => scope.trim()).filter(scope => scope)

    for (let i = 0; i < scopes.length; i++) {
      let scope = scopes[i]
      if (!application.canScope(scope)) {
        ctx.throw(`"scope.${scope}" no permission`, 400, {code: 'invalid_scope'})
      }
    }
  }

  switch (params.grant_type || '') {
    case 'refresh_token':
      // 刷新 token
      token = await refreshTokenMiddleware(ctx)

      // 权限
      if (scopes) {
        for (let i = 0; i < scopes.length; i++) {
          let scope = scopes[i]
          if (!token.canScope(scope)) {
            ctx.throw(`"scope.${scope}" no permission`, 400, {code: 'invalid_scope'})
          }
        }
      } else {
        scopes = token.get('scopes')
      }

      // 创建 accessToken
      var accessToken = new Token({
        type: 'access',
        scopes,
        parent: token,
        user: token.get('user'),
        authorize: token.get('authorize'),
        application: token.get('application'),
      })

      if (!accessToken.updateLog(ctx, true)) {
        accessToken.set('logs', token.get('logs'))
      }
      await accessToken.save()

      // 响应 state
      ctx.vmState({
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('secret'),
        refresh_token: token.get('id') + token.get('secret'),
      })
      break;
    case 'authorization_code':
      // 验证码登录
      token = await codeTokenMiddleware(ctx)

      // redirect_uri 参数判断
      if (typeof params.redirect_uri != 'undefined' && token.get('state.redirectUri') !== params.redirect_uri) {
        ctx.throw('"redirect_uri" parameter is incorrect', 403, {code:'invalid_grant'})
      }

      // 删除
      token.set('deletedAt', new Date)

      await token.save()

      var refreshToken = new Token({
        type: 'refresh',
        scopes: token.get('scopes'),
        parent: token,
        user: token.get('user'),
        authorize: token.get('authorize'),
        application: token.get('application'),
        logs: token.get('logs'),
      })
      await refreshToken.save()

      var accessToken = new Token({
        type: 'access',
        scopes: token.get('scopes'),
        parent: refreshToken,
        user: token.get('user'),
        authorize: token.get('authorize'),
        application: token.get('application'),
        logs: token.get('logs'),
      })
      await accessToken.save()

      ctx.vmState({
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('secret'),
        refresh_token: refreshToken.get('id') + refreshToken.get('secret'),
      })
      break;
    case 'password':
      // 密码登录
      if (!application.get('auths').get('password')) {
        ctx.throw('The authorization mode is not allowed', 400, {code: 'unsupported_response_type'})
      }
      scopes = scopes || []
      var username = params.username || ''
      var password = params.password || ''
      if (!username) {
        ctx.throw('Username can not be empty', 403, {code: 'invalid_grant'})
      }

      if (!password) {
        ctx.throw('Password can not be empty', 403, {code: 'invalid_grant'})
      }

      // 取用户
      var user
      try {
        await passwordRateLimit(ctx, async function() {
          user = await User.findByAuth(username)
        })
      } catch (e) {
        e.code = 'invalid_client'
        throw e
      }

      if (!user) {
        ctx.throw('Username does not exist', 404, {code: 'invalid_grant'})
      }

      if (!await user.comparePassword(password)) {
        var message = new Message({
          user,
          application,
          type: 'auth_login',
          readOnly: true,
          error: true,
          oauth: true,
          userAgent: Application.forwardUserAgent(ctx, ''),
          ip: Application.forwardIp(ctx, '0.0.0.0'),
        })
        await message.save()
        ctx.throw('Incorrect password', 403, {code: 'invalid_grant'})
      }

      // 黑名单
      if (await user.can('login')) {
        ctx.throw(`Your account is blocked because of "${user.get('reason')}"`, 403, {code: 'invalid_grant', black: true})
      }

      // 取认证
      var authorize = await Authorize.findOneCreate(user, application)

      var refreshToken = new Token({
        type: 'refresh',
        scopes,
        user,
        authorize,
        application,
      })
      refreshToken.updateLog(ctx, true)
      await refreshToken.save()

      var accessToken = new Token({
        type: 'access',
        scopes,
        parent: refreshToken,
        user,
        authorize,
        application,
      })
      accessToken.updateLog(ctx, true)
      await accessToken.save()

      var message = new Message({
        user,
        type: 'auth_login',
        readOnly: true,
        oauth: true,
        token: accessToken,
      })
      await message.save()

      ctx.vmState({
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('secret'),
        refresh_token: refreshToken.get('id') + refreshToken.get('secret'),
      })
      break;
    case 'client_credentials':
      // 客户端 登陆
      scopes = scopes || ['**']

      var user = await User.findById(application.get('creator')).exec()

      // 取认证
      var authorize = await Authorize.findOneCreate(user, application)


      var accessToken = new Token({
        type: 'access',
        scopes,
        user,
        renewal: true,
        authorize,
        application,
        expiredAt,
      })
      await accessToken.save()

      var message = new Message({
        user,
        type: 'auth_login',
        readOnly: true,
        oauth: true,
        userAgent: Application.forwardUserAgent(ctx, ''),
        token: accessToken,
        ip: Application.forwardIp(ctx, ctx.ip),
      })
      await message.save()

      ctx.vmState({
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('secret'),
      })
      break;
    default:
      ctx.throw('"grant_type" not supported', 400, {code: 'unsupported_grant_type'})
  }
}
