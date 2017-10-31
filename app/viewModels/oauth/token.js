/* @flow */
import User from 'models/user'
import Token from 'models/token'
import Message from 'models/message'
import Authorize from 'models/authorize'
import Application from 'models/application'

import tokenMiddleware from 'viewModels/middlewares/token'
import rateLimitMiddleware from 'viewModels/middlewares/rateLimit'

import type { Context } from 'koa'

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

const passwordRateLimit = rateLimitMiddleware({
  name: 'token-password-ip',
  limit: 10,
  key(ctx) {
    return Application.forwardIp(ctx) || false
  }
}, {
  name: 'token-password-username',
  limit: 15,
  key(ctx: Context) {
    let request = ctx.request
    let username
    if (request.body && request.body.username) {
      username = request.body.username
    } else if (request.query.username) {
      username = request.query.username
    }
    return String(username).trim().toLocaleLowerCase() || false
  }
})



export default async function (ctx: Context) {
  let token: ?Token
  let application: Application = ctx.state.application
  let params = {
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
    ...ctx.request.query
  }


  if (params.token_type && String(params.token_type).toLocaleLowerCase() !== 'bearer') {
    ctx.throw(403, 'incorrect', { path: 'token_type', value: params.token_type, code: 'invalid_grant' })
  }

  let scopes = params.scope || params.scopes
  if (typeof scopes !== 'undefined') {
    if (!Array.isArray(scopes)) {
      scopes = String(scopes).split(' ').map(scope => scope.trim()).filter(scope => scope)
    }
    for (let i = 0; i < scopes.length; i++) {
      let scope = scopes[i]
      if (!await application.canBoolean('scope', { path: scope })) {
        ctx.throw(400, 'match', { path: 'scope', value: scope, code: 'invalid_scope' })
      }
    }
  }
  switch (params.grant_type || '') {
    case 'refresh_token': {
      // 刷新 token
      if (!(token = await refreshTokenMiddleware(ctx))) {
        ctx.throw(500)
        return
      }

      // 权限
      if (scopes) {
        for (let i = 0; i < scopes.length; i++) {
          let scope = scopes[i]
          if (!await token.canBoolean('scope', { path: scope, application: false })) {
            ctx.throw(400, 'match', { path: 'scope', value: scope, code: 'invalid_scope' })
          }
        }
      } else {
        scopes = token.get('scopes')
      }

      // 创建 accessToken
      let accessToken = new Token({
        type: 'access',
        scopes,
        parent: token,
        user: token.get('user'),
        authorize: token.get('authorize'),
        application: token.get('application'),
      })
      accessToken.updateLog(ctx, true)
      await accessToken.save()

      // 登录信息
      let message = new Message({
        user: token.get('user'),
        type: 'user_login',
        refresh: true,
        oauth: true,
        token,
      })
      await message.save()

      // 响应 state
      ctx.vmState({
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('secret'),
      })
      break
    }
    case 'authorization_code': {
      // 验证码登录
      if (!(token = await codeTokenMiddleware(ctx))) {
        ctx.throw(500)
        return
      }

      // redirect_uri 参数判断
      if (typeof params.redirect_uri !== 'undefined' && token.get('state.redirectUri') !== params.redirect_uri) {
        ctx.throw(403, 'incorrect', { path: 'redirect_uri', value: params.redirect_uri, code: 'invalid_grant' })
      }

      // 删除
      token.set('deletedAt', new Date)
      await token.save()

      let refreshToken = new Token({
        type: 'refresh',
        scopes: token.get('scopes'),
        parent: token,
        user: token.get('user'),
        authorize: token.get('authorize'),
        application: token.get('application'),
        logs: token.get('logs'),
      })
      await refreshToken.save()

      let accessToken = new Token({
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
      break
    }
    case 'password': {
      // 密码登录
      if (!application.get('auths').get('password')) {
        ctx.throw(400, 'incorrect', { path: 'grant_type', code: 'unsupported_response_type' })
      }
      scopes = scopes || []
      let username = String(params.username || '')
      let password = String(params.password || '')
      if (!username) {
        ctx.throw(403, 'required', { path: 'username', code: 'invalid_grant' })
      }

      if (!password) {
        ctx.throw(403, 'required', { path: 'password', code: 'invalid_grant' })
      }

      // 取用户
      let user: ?User
      try {
        await passwordRateLimit(ctx, async function () {
          user = await User.findByAuth(username)
        })
      } catch (e) {
        e.code = 'invalid_client'
        throw e
      }

      if (!user) {
        ctx.throw(404, 'notexist', { path: 'user', code: 'invalid_grant' })
        return
      }

      if (!await user.comparePassword(password)) {
        let message = new Message({
          user,
          application,
          type: 'user_login',
          error: true,
          oauth: true,
          userAgent: Application.forwardUserAgent(ctx, ''),
          ip: Application.forwardIp(ctx, '0.0.0.0'),
        })
        await message.save()
        ctx.throw(403, 'incorrect', { path: 'password', code: 'invalid_grant' })
      }

      let accessToken: Token = new Token({
        type: 'access',
        scopes,
        application,
      })
      accessToken.updateLog(ctx, true)

      //  权限
      await user.setToken(accessToken).can('login')

      // 取认证
      let authorize = await Authorize.findOneCreate(user, application)

      let refreshToken = new Token({
        type: 'refresh',
        scopes,
        user,
        authorize,
        application,
      })
      refreshToken.updateLog(ctx, true)
      await refreshToken.save()


      accessToken.set('parent', refreshToken)
      accessToken.set('user', user)
      accessToken.set('authorize', authorize)
      await accessToken.save()

      let message = new Message({
        user,
        type: 'user_login',
        oauth: true,
        token: accessToken,
      })
      await message.save()

      ctx.vmState({
        ...accessToken.toJSON(),
        access_token: accessToken.get('id') + accessToken.get('secret'),
        refresh_token: refreshToken.get('id') + refreshToken.get('secret'),
      })
      break
    }
    case 'client_credentials': {
      // 客户端 登陆
      scopes = scopes || ['**']

      let user: ?User = await User.findById(application.get('creator')).exec()
      if (!user) {
        ctx.throw(500)
        return
      }

      // 取认证
      let authorize = await Authorize.findOneCreate(user, application)

      let accessToken = new Token({
        type: 'access',
        scopes,
        user,
        client: true,
        authorize,
        application,
      })
      await accessToken.save()


      let message = new Message({
        user,
        type: 'user_login',
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
      break
    }
    default:
      ctx.throw(400, 'incorrect', { path: 'grant_type', code: 'unsupported_grant_type' })
  }
}
