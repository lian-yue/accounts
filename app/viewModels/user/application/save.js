import { Types } from 'mongoose'
import Message from 'models/message'
import Application from 'models/application'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var application = ctx.state.applicationState

  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }
  if (!application) {
    application = new Application({
      creator: user || tokenUser,
    })
  }
  await application.setToken(token).canThrow('save')


  if (typeof params.name == 'string') {
    application.set('name', params.name)
  }

  if (typeof params.slug == 'string') {
    application.set('slug', params.slug)
  }

  if (typeof params.content == 'string') {
    application.set('content', params.content)
  }

  if (typeof params.homeUrl == 'string') {
    application.set('homeUrl', params.homeUrl)
  }

  if (typeof params.logoUrl == 'string') {
    application.set('logoUrl', params.logoUrl)
  }

  if (typeof params.pushUrl == 'string') {
    application.set('pushUrl', params.pushUrl)
  }

  if (params.secret) {
    application.set('secret', Application.createRandom(32))
  }

  if (params.requestOrigins !== void 0) {
    var requestOrigins = []
    if (typeof params.requestOrigins == 'string') {
      requestOrigins = params.requestOrigins.split(',')
    } else if (params.requestOrigins instanceof Array) {
      requestOrigins = params.requestOrigins
    }
    requestOrigins = requestOrigins.map(requestOrigin => String(requestOrigin || '').trim()).filter(requestOrigin => requestOrigin)
    application.set('requestOrigins', requestOrigins)
  }

  if (params.redirectUris !== void 0) {
    var redirectUris = []
    if (typeof params.redirectUris == 'string') {
      redirectUris = params.redirectUris.split(',')
    } else if (params.redirectUris instanceof Array) {
      redirectUris = params.redirectUris
    }
    redirectUris = redirectUris.map(redirectUri => String(redirectUri || '').trim()).filter(redirectUri => redirectUri)
    application.set('redirectUris', redirectUris)
  }


  if (params.allowedIps !== void 0) {
    var allowedIps = []
    if (typeof params.allowedIps == 'string') {
      allowedIps = params.allowedIps.split(',')
    } else if (params.allowedIps instanceof Array) {
      allowedIps = params.allowedIps
    }
    allowedIps = allowedIps.map(allowedIp => String(allowedIp || '').trim()).filter(allowedIp => allowedIp)
    application.set('allowedIps', allowedIps)
  }


  if (params.auths !== void 0) {
    var auths = []
    if (typeof params.auths == 'string') {
      auths = params.auths.split(',')
    } else if (params.auths instanceof Array) {
      auths = params.auths
    } else if (auths && typeof auths == 'object') {
      for (let name in params.auths) {
        if (params.auths[name]) {
          auths.push(name)
        }
      }
    }
    var newAuths = {}
    for (let i = 0; i < auths.length; i++) {
      let name = auths[i]
      if (await application.can('auths_' + name)) {
        newAuths[name] = true
      }
    }
    application.set('auths', newAuths)
  }


  if (params.scopes !== void 0) {
    var scopes = []
    if (typeof params.scopes == 'string') {
      scopes = params.scopes.split(',')
    } else if (params.scopes instanceof Array) {
      scopes = params.scopes
    }
    var newScopes = []
    for (let i = 0; i < scopes.length; i++) {
      let scope = scopes[i]
      if (application.canScope(scope)) {
        newScopes.push(scope)
      }
    }
    application.set('scopes', newScopes)
  }

  var message = new Message({
    user: application.get('creator'),
    creator: tokenUser,
    type: 'application_save',
    readOnly: true,
    token,
  })
  await message.save()

  await application.save()


}
