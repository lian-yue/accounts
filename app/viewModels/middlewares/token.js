import User from 'models/user'
import Token from 'models/token'
import corsMiddleware from './cors'
import applicationMiddleware from './application'


function getTokenKey(ctx, name) {
  var key
  var headerName = 'x-' +  name.replace(/_/g, '-')
  if (ctx.request.query[name]) {
    key = ctx.request.query[name]
  } else if (ctx.request.header[headerName]) {
    key = ctx.request.header[headerName]
  } else if (ctx.request.header.authorization && ctx.request.header.authorization.trim().substr(0, 7).toLocaleLowerCase() == 'bearer ') {
    key = ctx.request.header.authorization.trim().substr(7).trim()
  } else if (ctx.request.body instanceof Object && ctx.request.body[name]) {
    key = ctx.request.body[name]
  } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields[name]) {
    key = ctx.request.body.fields[name]
  }
  return key
}

export default function(opt) {
  opt = opt || {}
  opt = {
    types: ['access'],
    required: true,
    strict: true,
    black: true,
    cors: true,
    auths: [],
    ...opt,
  }

  if (!Array.isArray(opt.types)) {
    opt.types = [opt.types]
  }

  if (!opt.name) {
    opt.name = opt.types[0] + '_token'
  }

  if (opt.application) {
    opt.application = applicationMiddleware(opt.application)
  }

  return async function(ctx, next) {
    var token = ctx.state.token
    delete ctx.state.token
    if (opt.application) {
      await opt.application(ctx, async function() {})
    }
    var application = ctx.state.application
    var key = getTokenKey(ctx, opt.name)
    var csrf
    if (key) {
    } else if (ctx.cookies.get(opt.name) && (opt.cookie || ['HEAD', 'GET', 'OPTIONS'].indexOf(ctx.method) != -1 || (csrf = getTokenKey(ctx, 'csrf_token')))) {
      key = ctx.cookies.get(opt.name)
    }

    // 空 并且不是必须
    if (!key && !opt.required) {
      if (!next) {
        return false
      }
      await next()
      return
    }

    key = String(key)

    // csrf 不正确
    if (csrf && csrf !== key.substr(0, 24)) {
      ctx.throw('"csrf_token" parameter error', 400, {code: 'invalid_request', csrf: true})
    }

    if (typeof key != 'string' || key.length <= 24) {
      ctx.throw(`"${opt.name}" parameter error`, 400, {code: 'invalid_request'})
    }

    if (!token || token.get('id') !== key.substr(0, 24)) {
      token = await Token.findById(key.substr(0, 24))
        .populate({
          path: 'user',
          populate: [User.metaPopulate(true)]
        })
        .populate({
          path:'application',
        })
        .populate({
          path:'authorize',
        })
        .exec()
    }


    // 不存在
    if (!token || token.get('secret') !== key.substr(24)) {
      ctx.throw(`"${opt.name}" does not exist`, 401, {code: 'invalid_client'})
    }

    var user = token.get('user')
    if (user) {
      user.setToken(token)
    }

    if (token.get('authorize')) {
      token.get('authorize').setToken(token)
    }

    // 令牌类型
    if (opt.types.indexOf(token.get('type')) == -1) {
      ctx.throw(`"${opt.name}" does not exist`, 401, {code: 'invalid_client'})
    }

    // 令牌 和 application 不匹配
    if (application && opt.authorize !== false && (!token.get('application') || !token.get('application').equals(application))) {
      ctx.throw(`"${opt.name}" does not match`, 403, {code: 'invalid_client'})
    }

    // 严格模式  application 必须 相同
    if (opt.strict && Boolean(application) != Boolean(token.get('application'))) {
      ctx.throw(`"${opt.name}" does not match`, 403, {code: 'invalid_client'})
    }

    // 令牌令牌 authorize 字段 匹配
    if (typeof opt.authorize != 'undefined') {
      if (opt.authorize) {
        if (!token.get('authorize')) {
          ctx.throw('"authorize" does not match', 403, {code: 'invalid_client'})
        }
      } else if (token.get('authorize')) {
        ctx.throw('"authorize" does not match', 403, {code: 'invalid_client'})
      }
    }

    // cors
    if (opt.cors && token.get('application') && !(await corsMiddleware(ctx, token.get('application'))) && next) {
      return
    }

    // 被删除 or 已过期
    if (token.get('deletedAt') || token.get('expiredAt').getTime() < Date.now()) {
      ctx.throw(`"${opt.name}" has expired`, 401, {code: 'invalid_grant', expired: true})
    }

    // application 无效
    if (token.get('application') && (token.get('application').get('status') == 'block' || token.get('application').get('deletedAt'))) {
      ctx.throw(`Invalid application`, 401, {code: 'invalid_grant', application: true})
    }

    // 认证被删除
    if (token.get('authorize') && token.get('authorize').get('deletedAt')) {
      ctx.throw(`"${opt.name}" has expired`, 401, {code: 'invalid_grant', expired: true, authorize: true})
    }


    // auths
    var applicationAuths = application || token.get('application')
    if (applicationAuths) {
      for (let i = 0; i < opt.auths.length; i++) {
        if (!applicationAuths.get('auths').get(opt.auths[i])) {
          ctx.throw('The authorization mode is not allowed', 400, {code: 'unsupported_response_type'})
        }
      }
    }

    // 是否要登陆
    if (typeof opt.user != 'undefined') {
      if (opt.user) {
        if (!user) {
          ctx.throw('You have not logged in', 401, {code: 'invalid_grant', login: true})
        }
      } else if (user) {
        ctx.throw('You are logged in', 403, {code: 'invalid_grant', login: true})
      }
    }

    // 黑名单
    if (opt.black && token.get('application') && user && user.get('black')) {
      ctx.throw(`Your account is blocked because of "${user.get('reason')}"`, 403, {code: 'invalid_grant', black: true})
    }

    // 日志
    if (opt.log !== false) {
      token.updateLog(ctx, opt.log)
    }

    // 过期时间
    var date = new Date
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
