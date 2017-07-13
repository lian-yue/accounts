import User from 'models/user'
import Token from 'models/token'
import Application from 'models/application'
import rateLimit from 'viewModels/middlewares/rateLimit'
import tokenMiddleware from 'viewModels/middlewares/token'

const refreshTokenMiddleware = tokenMiddleware({
  types: ['refresh'],
  user: true,
  authorize: true,
  application: true,
  log: true,
})

const codeTokenMiddleware = tokenMiddleware({
  name: 'code',
  types: ['code'],
  user: true,
  authorize: true,
  application: true,
})

const passwordRateLimit = rateLimit({
  name: 'token-password-ip',
  limit: 10,
  filter(ctx) {
    return ctx.state.tokenPasswordIp = Application.forwardIp(ctx)
  },
  key(ctx) {
    return ctx.state.tokenPasswordIp
  }
}, {
  name: 'token-password-username',
  limit: 15,
  key(ctx) {
    var username = ctx.body.username || ''
    return username.trim().toLocaleLowerCase()
  }
})



export default async function (ctx) {
  var token
  var application = ctx.state.application
  var params = {...ctx.request.body, ...ctx.request.query}


  var authType = params.token_type || 'bearer'
  authType = authType.toLocaleLowerCase()
  if (authType !== 'bearer') {
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
        authType,
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
        access_token: accessToken.get('id') + accessToken.get('key'),
        refresh_token: token.get('id') + token.get('key'),
      })
      break;
    case 'authorization_code':
      // 验证码登录
      token = await codeTokenMiddleware(ctx)

      // redirect_uri 参数判断
      if (typeof params.redirect_uri != 'undefined' && token.get('state').get('redirectUri') !== params.redirect_uri) {
        ctx.throw('"redirect_uri" parameter is incorrect', 403, {code:'invalid_grant'})
      }

      // 删除
      token.set('deletedAt', new Date)

      await token.save()

      var refreshToken
      if (authType == 'bearer') {
        refreshToken = new Token({
          type: 'refresh',
          authType,
          scopes: token.get('scopes'),
          parent: token,
          user: token.get('user'),
          authorize: token.get('authorize'),
          application: token.get('application'),
          logs: token.get('logs'),
        })
        await refreshToken.save()
      }

      var accessToken = new Token({
        type: 'access',
        authType,
        scopes: token.get('scopes'),
        parent: refreshToken ||  token,
        user: token.get('user'),
        authorize: token.get('authorize'),
        application: token.get('application'),
        logs: token.get('logs'),
      })
      await accessToken.save()


      var state = {
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('key'),
      }
      if (refreshToken) {
        state.refresh_token = refreshToken.get('id') + refreshToken.get('key')
      }
      ctx.vmState(state)
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
          user = await User.findByUsername(username, true)
        })
      } catch (e) {
        e.code = 'invalid_client'
        throw e
      }

      if (!user) {
        ctx.throw('Username does not exist', 404, {code: 'invalid_grant'})
      }

      if (!await user.comparePassword(password)) {
        var log = new Log({
          type: 'error',
          path: 'auth/login',
          oauth: true,
          userAgent: Application.forwardUserAgent(ctx, ''),
          ip: Application.forwardIp(ctx, '0.0.0.0'),
          user,
          token: refreshToken || accessToken,
          application,
        })
        await log.save()
        ctx.throw('Incorrect password', 403, {code: 'invalid_grant'})
      }



      // 黑名单
      if (await user.can('login')) {
        ctx.throw(`Your account is blocked because of "${user.get('reason')}"`, 403, {code: 'invalid_grant', black: true})
      }

      // 取认证
      var authorize = await Authorize.findOneCreate(user, application)

      var refreshToken
      if (authType == 'bearer') {
        refreshToken = new Token({
          type: 'refresh',
          authType,
          scopes,
          user,
          authorize,
          application,
        })
        refreshToken.updateLog(ctx, true)
        await refreshToken.save()
      }

      var accessToken = new Token({
        type: 'access',
        scopes,
        authType,
        parent: refreshToken,
        user,
        authorize,
        application,
      })
      accessToken.updateLog(ctx, true)
      await accessToken.save()

      var state = {
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('key'),
      }
      if (refreshToken) {
        state.refresh_token = refreshToken.get('id') + refreshToken.get('key')
      }



      var log = new Log({
        path: 'auth/login',
        oauth: true,
        userAgent: Application.forwardUserAgent(ctx, ''),
        ip: Application.forwardIp(ctx, '0.0.0.0'),
        user,
        token: refreshToken || accessToken,
        application,
      })
      await log.save()

      ctx.vmState(state)
      break;
    case 'client_credentials':
      // 客户端 登陆
      scopes = scopes || ['**']

      var user = User.findById(application.get('creator'))

      // 取认证
      var authorize = await Authorize.findOneCreate(user, application)



      var expiredAt = new Date
      expiredAt.setFullYear(expiredAt.getFullYear() + 3)
      var accessToken = new Token({
        type: 'access',
        authType,
        scopes,
        user,
        authorize,
        application,
        expiredAt,
      })

      await accessToken.save()
      var state = {
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('key'),
      }


      var log = new Log({
        path: 'auth/login',
        oauth: true,
        userAgent: Application.forwardUserAgent(ctx, ctx.request.header['user-agent'] || ''),
        ip: Application.forwardIp(ctx, ctx.ip),
        user,
        token: accessToken,
        application,
      })
      await log.save()

      ctx.vmState(state)
      break;
    default:
      ctx.throw('"grant_type" not supported', 400, {code: 'unsupported_grant_type'})
  }
}
