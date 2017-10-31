/* @flow */
import Application from 'models/application'
import corsMiddleware from './cors'

import type { Context } from 'koa'

export default function (
  {
    secret = true,
    required = true,
    cors = true,
    auths = [],
  }: {
    secret?: boolean,
    required?: boolean,
    cors?: boolean,
    auths?: string[]
  } = {}) {

  return async function (ctx: Context, next: () => Promise<void>) {
    let token: ?TokenModel | void = ctx.state.token
    let application: Application | void = ctx.state.application
    delete ctx.state.application
    let applicationId
    let applicationSecret
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


    if (secret && ctx.request.header.authorization && ctx.request.header.authorization.trim().substr(0, 6) === 'basic ') {
      let authorization = Buffer.from(ctx.request.header.authorization.trim().substr(6).trim(), 'base64').toString()
      let index = authorization.indexOf(':')
      if (index === -1) {
        authorization = [authorization]
      } else {
        authorization = [
          authorization.substr(0, index),
          authorization.substr(index + 1)
        ]
      }
      if (applicationId && authorization[0] !== applicationId) {
        ctx.throw(400, 'match', { path: 'id', code: 'invalid_request' })
      }
      if (applicationSecret && authorization[1] !== applicationSecret && authorization[1] !== undefined) {
        ctx.throw(400, 'incorrect', { path: 'secret', code: 'invalid_request' })
      }

      applicationId = authorization[0]
      if (authorization[1]) {
        applicationSecret = authorization[1]
      }
    }

    if (!applicationId && !required) {
      await next()
      return
    }

    if (!applicationId) {
      ctx.throw(400, 'required', { path: 'id', code: 'invalid_request' })
    }

    if (!applicationSecret && secret) {
      ctx.throw(400, 'required', { path: 'secret', code: 'invalid_request' })
    }

    if (typeof applicationId !== 'string' || applicationId.length !== 24) {
      ctx.throw(400, 'match', { path: 'id', code: 'invalid_request' })
      return
    }

    if (!application || !application.equals(applicationId)) {
      // $flow-disable-line
      application = await Application.findById(applicationId).exec()
    }

    // 不存在
    if (!application || application.get('deletedAt')) {
      ctx.throw(401, 'notexist', { path: 'application', code: 'invalid_client' })
      return
    }

    application.setToken(token ? token : undefined)

    // cors
    if (cors && !corsMiddleware(ctx, application)) {
      return
    }

    // 不正确
    if (secret && application.get('secret') !== applicationSecret) {
      ctx.throw(401, 'incorrect', { path: 'secret', code: 'invalid_client' })
    }

    // 被禁用
    if (application.get('status') === 'black') {
      ctx.throw(401, 'black', { path: 'application', code: 'invalid_client' })
    }

    // 令牌 和 application 不匹配
    if (token && (!token.get('application') || !token.get('application').equals(application))) {
      ctx.throw(403, 'match', { path: 'token', code: 'invalid_client' })
    }

    // auths
    for (let i = 0; i < auths.length; i++) {
      if (!application.get('auths').get(auths[i])) {
        ctx.throw(400, 'match', { path: 'auths', code: 'unsupported_response_type' })
      }
    }

    // ip 白名单
    if (secret) {
      await application.can('allowed_ip')
    }

    ctx.state.application = application

    await next()
  }
}
