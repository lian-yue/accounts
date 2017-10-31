/* @flow */
import Auth from 'models/auth'
import Message from 'models/message'
import Verification from 'models/verification'

import oauthConfig from 'config/oauth'
import type { Context } from 'koa'
import type User from 'models/user'
import type Token from 'models/token'
export default async function (ctx: Context) {
  let auth: Auth = ctx.state.auth
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }
  if (!auth) {
    auth = new Auth({
      user: user || tokenUser,
      column: String(params.column || ''),
      value: String(params.value || ''),
    })
  }
  ctx.state.rateLimit = false
  await auth.setToken(token).can('save')

  if (params.settings) {
    if (typeof params.settings !== 'object') {
      try {
        params.settings = JSON.parse(params.settings)
      } catch (e) {
        e.status = 403
        throw e
      }
    }
    if (params.settings && typeof params.settings === 'object' && !Array.isArray(params.settings)) {
      auth.set('settings', params.settings)
    }
  }

  if (auth.isNew) {
    ctx.state.rateLimit = true
    let column: string = auth.get('column')
    if (column === 'email' || column === 'phone') {
      let validate
      if ((validate = auth.validateSync())) {
        throw validate
      }

      if (!params.code) {
        ctx.throw(403, 'required', { path: 'code' })
      }

      let verification = await Verification.findByCode({
        token,
        type: 'auth_save',
        code: params.code,
        user: auth.get('user'),
        to: auth.get('value'),
        toType: column === 'phone' ? 'sms' : column,
      })
      if (!verification && ctx.app.env !== 'development') {
        ctx.throw(403, 'incorrect', { path: 'code' })
      }
    } else if (oauthConfig[column]) {
      let state = token.get('state.auth.' + column) || {}
      let userInfo = state.userInfo
      if (!userInfo || !userInfo.id || (Date.now() - 300 * 10000) > state.createdAt.getTime()) {
        ctx.throw(401, 'notlogged', { column })
      }
      token.set('state.auth.' + column, undefined)

      auth.set('value', userInfo.id)
      auth.set('token', state.accessToken)
      auth.set('state', state.userInfo)
      auth.oncePost(token)
    } else {
      ctx.throw(403, 'match', { path: 'column' })
    }


    let message = new Message({
      user: auth.get('user'),
      contact: auth.get('user'),
      creator: tokenUser,
      application: token.get('application'),
      type: 'auth_save',
      auth: auth.get('_id'),
      display: auth.get('display'),
      token,
    })
    auth.oncePost(message)
  }
  await auth.save()
}
