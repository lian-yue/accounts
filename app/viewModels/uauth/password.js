/* @flow */
import User from 'models/user'
import Auth from 'models/auth'
import Message from 'models/message'
import Authorize from 'models/authorize'
import Verification from 'models/verification'

import type { Context } from 'koa'
import type Token from 'models/token'
import type Application from 'models/application'
export default async function (ctx: Context) {

  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let id = String(params.id || '')
  let code = String(params.code || '').trim()

  let token: Token = ctx.state.token
  let application: ?Application = token.get('application')

  if (!id) {
    ctx.throw(403, 'required', { path: 'id' })
  }

  let auth: ?Auth = await Auth.findById(id).populate({
    path: 'user',
    populate: [User.metaPopulate(true)]
  }).exec()

  if (!auth || auth.get('deletedAt') || ['email', 'phone'].indexOf(auth.get('column')) === -1) {
    ctx.throw(403, 'notexist', { path: 'auth' })
    return
  }

  let user: User = auth.get('user')

  let verification: ?Verification = await Verification.findByCode({
    user,
    token,
    type: 'user_password',
    code,
    to: auth.get('value'),
    test: Boolean(params.test),
  })

  if (!verification && ctx.app.env !== 'development') {
    ctx.throw(403, 'incorrect', { path: 'code' })
  }

  // 测试
  if (params.test) {
    ctx.vmState({})
    return
  }

  let newPassword = String(params.new_password || '')
  let newPasswordAgain = String(params.new_password_again || '')

  user.set('password', newPassword)
  user.set('newPassword', newPassword)
  user.set('newPasswordAgain', newPasswordAgain)

  await user.save()



  let authorize
  if (application) {
    authorize = await Authorize.findOneCreate(user, application)
  }
  token.set('user', user)
  token.set('authorize', authorize)
  await token.save()


  let message = new Message({
    user,
    type: 'user_password',
    token,
  })
  await message.save()


  ctx.vmState(token)
}
