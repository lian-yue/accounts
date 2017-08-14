import Application from 'models/application'
import cors from './cors'

export default function(opt) {
  opt = opt || {}
  opt = {
    secret: true,
    required: true,
    cors: true,
    auths: [],
    ...opt,
  }

  return async function(ctx, next) {
    var token = ctx.state.token
    var application = ctx.state.application
    delete ctx.state.application
    var applicationId
    var applicationSecret
    if (ctx.query.application_id) {
      applicationId = ctx.query.application_id
    } else if (ctx.request.body instanceof Object && ctx.request.body.application_id) {
      applicationId = ctx.request.body.application_id
    } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.application_id) {
      applicationId = ctx.request.body.fields.application_id
    } else if (ctx.query.app_id) {
      applicationId = ctx.query.app_id
    } else if (ctx.request.body instanceof Object && ctx.request.body.app_id) {
      applicationId = ctx.request.body.app_id
    } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.app_id) {
      applicationId = ctx.request.body.fields.app_id
    } else if (ctx.query.client_id) {
      applicationId = ctx.query.client_id
    } else if (ctx.request.body instanceof Object && ctx.request.body.client_id) {
      applicationId = ctx.request.body.client_id
    } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.client_id) {
      applicationId = ctx.request.body.fields.client_id
    }
    if (ctx.query.application_secret) {
      applicationSecret = ctx.query.application_secret
    } else if (ctx.request.body instanceof Object && ctx.request.body.application_secret) {
      applicationSecret = ctx.request.body.application_secret
    } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.application_secret) {
      applicationSecret = ctx.request.body.fields.application_secret
    } else if (ctx.query.app_secret) {
      applicationSecret = ctx.query.app_secret
    } else if (ctx.request.body instanceof Object && ctx.request.body.app_secret) {
      applicationSecret = ctx.request.body.app_secret
    } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.app_secret) {
      applicationSecret = ctx.request.body.fields.app_secret
    } else if (ctx.query.client_secret) {
     applicationSecret = ctx.query.client_secret
    } else if (ctx.request.body instanceof Object && ctx.request.body.client_secret) {
      applicationSecret = ctx.request.body.client_secret
    } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.client_secret) {
      applicationSecret = ctx.request.body.fields.client_secret
    }


    if (opt.secret && ctx.request.header.authorization && ctx.request.header.authorization.trim().substr(0, 6) == 'basic ') {
      let authorization = new Buffer(ctx.request.header.authorization.trim().substr(6).trim(), 'base64').toString()
      let index = authorization.indexOf(':')
      if (index == -1) {
        authorization = [authorization]
      } else {
        authorization = [
          authorization.substr(0, index),
          authorization.substr(index + 1)
        ]
      }
      if (applicationId && authorization[0] !== applicationId) {
        ctx.throw(`authorization "id" does not match`, 400, {code:'invalid_request'})
      }
      if (applicationSecret && authorization[1] !== applicationSecret && authorization[1] !== undefined) {
        ctx.throw(`authorization "secret" does not match`, 400, {code:'invalid_request'})
      }

      applicationId = authorization[0]
      if (authorization[1]) {
        applicationSecret = authorization[1]
      }
    }

    if (!applicationId && !opt.required) {
      await next()
      return
    }

    if (!applicationId) {
      ctx.throw(`"id" parameter is required`, 400, {code:'invalid_request'})
    }

    if (!applicationSecret && opt.secret) {
      ctx.throw(`"secret" parameter is required`, 400, {code:'invalid_request'})
    }

    if (typeof applicationId != 'string' || applicationId.length !== 24) {
      ctx.throw(`"id" parameter error`, 400, {code: 'invalid_request'})
    }

    if (!application || !application.equals(applicationId)) {
      application = await Application.findById(applicationId).exec()
    }

    // 不存在
    if (!application || application.get('deletedAt')) {
      ctx.throw(`The application does not exist`, 401, {code: 'invalid_client'})
    }

    // cors
    if (opt.cors && !(await cors(ctx, application))) {
      return
    }

    // 不正确
    if (opt.secret && application.get('secret') !== applicationSecret) {
      ctx.throw(`"secret" is incorrect`, 401, {code: 'invalid_client'})
    }

    // 被禁用
    if (application.get('status') == 'block') {
      ctx.throw(`The application is disabled`, 403, {code: 'unauthorized_client'})
    }

    // 令牌 和 application 不匹配
    if (token && (!token.get('application') || !token.get('application').equals(application))) {
      ctx.throw('"token" does not match', 403, {code: 'invalid_client'})
    }

    // auths
    for (let i = 0; i < opt.auths.length; i++) {
      if (!application.get('auths').get(opt.auths[i])) {
        ctx.throw('The authorization mode is not allowed', 400, {code: 'unsupported_response_type'})
      }
    }

    // ip 白名单
    if (opt.secret && !application.allowedIp(ctx.ip)) {
      ctx.throw('"IP" is not white list', 403, {code: 'unauthorized_client'})
    }

    ctx.state.application = application

    await next()
  }
}
