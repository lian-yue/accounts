/* @flow */
import User from 'models/user'
import Auth from 'models/auth'
import Message from 'models/message'
import Authorize from 'models/authorize'
import oauthConfig from 'config/oauth'

import type { Context } from 'koa'
import type Token from 'models/token'
import type Application from 'models/application'

export default async function (ctx: Context) {
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }
  let token: Token = ctx.state.token
  let application: ?Application = token.get('application')
  let user: ?User


  let column = String(params.column || '').toLowerCase().trim()
  if (column) {
    user = await User.findByAuth('www')
    if (!oauthConfig[column]) {
      ctx.throw(403, 'match', { path: 'column' })
    }
    let state: Object = token.get('state.auth.' + column) || {}
    let userInfo: ?Object = state.userInfo
    if (!userInfo || !userInfo.id || (Date.now() - 300 * 10000) > state.createdAt.getTime()) {
      ctx.throw(401, 'notlogged', { column })
      return
    }

    user = await User.findByAuth(userInfo.id, [column])

    if (!user) {
      ctx.throw(404, 'notexist', { path: 'user' })
      return
    }

    let auth = await Auth.findOne({ user, column, value: userInfo.id, deletedAt: { $exists: false } }).exec()
    if (auth) {
      auth.set('token', state.accessToken)
      auth.set('state', state.userInfo)
      token.oncePost(auth)
    }


    token.set('state.auth.' + column, undefined)
  } else {
    let username = String(params.username || '').toLowerCase().trim()
    let password = String(params.password || '')


    if (!username) {
      ctx.throw(403, 'required', { path: 'username' })
    }

    if (!password) {
      ctx.throw(403, 'required', { path: 'password' })
    }
    user = await User.findByAuth(username)

    if (!user) {
      ctx.throw(404, 'notexist', { path: 'user' })
      return
    }
    if (!await user.comparePassword(password)) {
      let message = new Message({
        user,
        type: 'user_login',
        column,
        error: true,
        token,
      })
      await message.save()
      ctx.throw(403, 'incorrect', { path: 'password' })
    }
  }

  await user.populate(User.metaPopulate(true)).execPopulate()

  await user.setToken(token).can('login')

  let authorize: Authorize
  if (application) {
    authorize = await Authorize.findOneCreate(user, application)
  }

  token.set('user', user)
  token.set('authorize', authorize)

  await token.save()

  let message = new Message({
    user,
    type: 'user_login',
    column,
    token,
  })
  await message.save()

  ctx.vmState(token)
}
