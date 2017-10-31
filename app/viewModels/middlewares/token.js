/* @flow */
import User from 'models/user'
import Token from 'models/token'
import corsMiddleware from './cors'
import applicationMiddleware from './application'

import type { Context } from 'koa'
import type Application from 'models/application'

function getTokenKey(ctx: Context, name: string): string {
  let key: mixed
  let headerName = 'x-' + name.replace(/_/g, '-')
  if (ctx.request.query[name]) {
    key = ctx.request.query[name]
  } else if (ctx.request.header[headerName]) {
    key = ctx.request.header[headerName]
  } else if (ctx.request.header.authorization && ctx.request.header.authorization.trim().substr(0, 7).toLocaleLowerCase() === 'bearer ') {
    key = ctx.request.header.authorization.trim().substr(7).trim()
  } else if (ctx.request.body instanceof Object && ctx.request.body[name]) {
    key = ctx.request.body[name]
  } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields[name]) {
    key = ctx.request.body.fields[name]
  }
  return String(key || '')
}



export default function ({
  types: optTypes = ['access'],
  required: optRequired = true,
  strict: optStrict = true,
  black: optBlack = true,
  cors: optCors = true,
  cookie: optCookie = false,
  name: optName = optTypes[0] + '_token',
  log: optLog = true,
  application: optApplication,
  auths: optAuths = [],
  user: optUser,
  authorize: optAuthorize,
}: {
  types?: string[],
  required?: boolean,
  strict?: boolean,
  black?: boolean,
  cors?: boolean,
  cookie?: boolean,
  authorize?: boolean,
  user?: boolean,
  log?: boolean,
  name?: string,
  application?: Object,
  auths?: string[],
} = {}): (ctx: Context, next?: () => Promise<void>) => Promise<Token | void> {
  let optApplicationMiddleware
  if (optApplication) {
    optApplicationMiddleware = applicationMiddleware(optApplication)
  }

  return async function (ctx: Context, next?: () => Promise<void>): Promise<Token | void> {
    let token: ?Token = ctx.state.token
    delete ctx.state.token
    if (optApplicationMiddleware) {
      await optApplicationMiddleware(ctx, async () => {})
    }
    let application: ?Application = ctx.state.application
    let key: string = getTokenKey(ctx, optName)
    let csrf
    if (key) {
      // key
    } else if (ctx.cookies.get(optName) && (optCookie || ['HEAD', 'GET', 'OPTIONS'].indexOf(ctx.method) !== -1 || (csrf = getTokenKey(ctx, 'csrf_token')))) {
      key = ctx.cookies.get(optName) || ''
    }

    // 空 并且不是必须
    if (!key && !optRequired) {
      if (!next) {
        return
      }
      await next()
      return
    }


    // csrf 不正确
    if (csrf && csrf !== key.substr(0, 24)) {
      ctx.throw(400, 'match', { path: 'csrf_token', code: 'invalid_request' })
    }

    if (key.length <= 24) {
      ctx.throw(400, 'match', { path: optName, code: 'invalid_request' })
    }


    if (!token || token.get('id') !== key.substr(0, 24)) {
      token = await Token.findById(key.substr(0, 24))
        .populate({
          path: 'user',
          populate: [User.metaPopulate(true)]
        })
        .populate({
          path: 'application',
        })
        .populate({
          path: 'authorize',
        })
        .exec()
    }



    // 不存在
    if (!token || token.get('secret') !== key.substr(24)) {
      ctx.throw(401, 'notexist', { path: optName, code: 'invalid_client' })
      return
    }

    let user: ?User = token.get('user')
    if (user) {
      user.setToken(token)
    }

    if (token.get('authorize')) {
      token.get('authorize').setToken(token)
    }

    // 令牌类型
    if (optTypes.indexOf(token.get('type')) === -1) {
      ctx.throw(401, 'notexist', { path: optName, code: 'invalid_client' })
    }

    // 令牌 和 application 不匹配
    if (application && optAuthorize !== false) {
      try {
        await token.can('application', { value: application })
      } catch (e) {
        e.code = 'invalid_client'
        throw e
      }
    }

    // 严格模式  application 必须 相同
    if (optStrict && Boolean(application) !== Boolean(token.get('application'))) {
      ctx.throw(403, 'match', { path: optName, code: 'invalid_client' })
    }

    // 令牌令牌 authorize 字段 匹配
    if (typeof optAuthorize !== 'undefined') {
      if (optAuthorize) {
        if (!token.get('authorize')) {
          ctx.throw(403, 'match', { path: 'authorize', code: 'invalid_client' })
        }
      } else if (token.get('authorize')) {
        ctx.throw(403, 'match', { path: 'authorize', code: 'invalid_client' })
      }
    }

    // cors
    if (optCors && token.get('application') && !corsMiddleware(ctx, token.get('application')) && next) {
      return
    }

    // 被删除 or 已过期
    if (token.get('deletedAt') || token.get('expiredAt').getTime() < Date.now()) {
      ctx.throw(401, 'hasexpire', { path: optName, code: 'invalid_grant' })
    }

    // application 无效
    if (token.get('application') && (token.get('application').get('status') === 'rejected' || token.get('application').get('status') === 'banned' || token.get('application').get('deletedAt'))) {
      ctx.throw(401, 'black', { path: optName, code: 'invalid_grant' })
    }

    // 认证被删除
    if (token.get('authorize') && token.get('authorize').get('deletedAt')) {
      ctx.throw(401, 'hasexpire', { path: optName, code: 'invalid_grant' })
    }


    // auths
    let applicationAuths = application || token.get('application')
    if (applicationAuths) {
      for (let i = 0; i < optAuths.length; i++) {
        if (!applicationAuths.get('auths').get(optAuths[i])) {
          ctx.throw(400, 'match', { path: 'auths', code: 'unsupported_response_type' })
        }
      }
    }

    // 是否要登陆
    if (typeof optUser !== 'undefined') {
      try {
        await token.can('user', { value: optUser })
      } catch (e) {
        e.code = 'invalid_grant'
        throw e
      }
    }

    // 黑名单
    if (optBlack && token.get('application') && user) {
      try {
        await token.can('user', { value: true, black: true })
      } catch (e) {
        e.code = 'invalid_grant'
        throw e
      }
    }

    // 日志
    if (optLog !== false) {
      token.updateLog(ctx, optLog)
    }

    // 过期时间
    let date = new Date
    if (token.get('renewal') && (token.get('expiredAt').getTime() - 86400 * 1000 * 20) < date.getTime()) {
      date.setTime(date.getTime() + 1000 * 86400 * 30)
      token.set('expiredAt', date)
    }

    if (token.isModified()) {
      await token.save()
    }

    ctx.state.token = token
    if (!next) {
      return ctx.state.token
    }
    await next()
  }
}
