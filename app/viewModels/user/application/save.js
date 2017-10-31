/* @flow */
import Message from 'models/message'
import Application from 'models/application'

import type { Context } from 'koa'
import type User from 'models/user'
import type Token from 'models/token'


export default async function (ctx: Context) {
  let user: ?User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let application: ?Application = ctx.state.applicationState

  let params = {
    ...ctx.request.query,
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  if (!application) {
    application = new Application({
      creator: user || tokenUser,
    })
  }
  await application.setToken(token).can('save')

  let oldName = application.get('name')

  if (typeof params.name === 'string') {
    application.set('name', params.name)
  }

  if (typeof params.slug === 'string') {
    application.set('slug', params.slug)
  }

  if (typeof params.content === 'string') {
    application.set('content', params.content)
  }

  if (typeof params.homeUrl === 'string') {
    application.set('homeUrl', params.homeUrl)
  }

  if (typeof params.logoUrl === 'string') {
    application.set('logoUrl', params.logoUrl)
  }

  if (typeof params.pushUrl === 'string') {
    application.set('pushUrl', params.pushUrl)
  }

  if (params.secret) {
    application.set('secret', Application.createRandom(32))
  }

  // 审核
  if (await application.canBoolean('status') && (application.isNew || params.status)) {
    application.set('status', params.status || 'approved')
  } else if (application.isModified(['name', 'slug', 'content', 'homeUrl', 'logoUrl'])) {
    application.set('status', 'pending')
  }

  if (params.requestOrigins !== undefined) {
    let requestOrigins = []
    if (typeof params.requestOrigins === 'string') {
      requestOrigins = params.requestOrigins.split(',')
    } else if (params.requestOrigins instanceof Array) {
      requestOrigins = params.requestOrigins
    }
    requestOrigins = requestOrigins.map(requestOrigin => String(requestOrigin || '').trim()).filter(requestOrigin => requestOrigin)
    application.set('requestOrigins', requestOrigins)
  }

  if (params.redirectUris !== undefined) {
    let redirectUris = []
    if (typeof params.redirectUris === 'string') {
      redirectUris = params.redirectUris.split(',')
    } else if (params.redirectUris instanceof Array) {
      redirectUris = params.redirectUris
    }
    redirectUris = redirectUris.map(redirectUri => String(redirectUri || '').trim()).filter(redirectUri => redirectUri)
    application.set('redirectUris', redirectUris)
  }


  if (params.allowedIps !== undefined) {
    let allowedIps = []
    if (typeof params.allowedIps === 'string') {
      allowedIps = params.allowedIps.split(',')
    } else if (params.allowedIps instanceof Array) {
      allowedIps = params.allowedIps
    }
    allowedIps = allowedIps.map(allowedIp => String(allowedIp || '').trim()).filter(allowedIp => allowedIp)
    application.set('allowedIps', allowedIps)
  }


  if (params.auths !== undefined) {
    let auths = []
    if (typeof params.auths === 'string') {
      auths = params.auths.split(',')
    } else if (params.auths instanceof Array) {
      auths = params.auths
    } else if (auths && typeof auths === 'object') {
      for (let name in params.auths) {
        if (params.auths[name]) {
          auths.push(name)
        }
      }
    }
    let newAuths = {}
    for (let i = 0; i < auths.length; i++) {
      newAuths[auths[i]] = true
    }
    await application.can('save', { auths: newAuths })
  }


  if (params.scopes !== undefined) {
    let scopes = []
    if (typeof params.scopes === 'string') {
      scopes = params.scopes.split(',')
    } else if (params.scopes instanceof Array) {
      scopes = params.scopes
    }
    let newScopes = []
    for (let i = 0; i < scopes.length; i++) {
      let scope = scopes[i]
      if (typeof scope !== 'string') {
        continue
      }
      scope = scope.toLocaleLowerCase().replace(/[^0-9a-z*\/_-]/g, '').replace(/^\/+|\/+$/g, '')
      if (!scope) {
        continue
      }
      if (await application.canBoolean('save', { scope })) {
        newScopes.push(scope)
      }
    }
    application.set('scopes', newScopes)
  }

  let message = new Message({
    user: application.get('creator'),
    contact: application.get('creator'),
    creator: tokenUser,
    applicationId: application.get('_id'),
    name: oldName || application.get('name'),
    type: 'application_save',
    token,
  })
  await message.save()

  await application.save()
}
