/* @flow */
import User from 'models/user'
import Auth from 'models/auth'
import Message from 'models/message'
import Authorize from 'models/authorize'
import Verification from 'models/verification'
import oauthConfig from 'config/oauth'

import type Token from 'models/token'
import type Application from 'models/application'
import type { Context } from 'koa'

export default async function (ctx: Context) {
  let validate
  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  let column = String(params.column || '').toLowerCase().trim()
  let username = String(params.username || '').trim()
  let nickname = String(params.nickname || '').trim() || username
  let password = String(params.password || '')
  let passwordAgain = String(params.password_again || '')
  let gender = String(params.gender || '').trim()
  let birthday = params.birthday ? new Date(String(params.birthday || '').trim()) : undefined
  let description = String(params.description || '')
  let locale = String(params.locale || 'en')



  let email = String(params.email || '').trim()
  let phone = String(params.phone || '').trim()
  let emailCode = String(params.email_code || '').trim()
  let phoneCode = String(params.phone_code || '').trim()
  let createType = String(params.create_type || '')

  let token: Token = ctx.state.token
  let application: Application | void = token.get('application')

  let user = new User({
    username,
    nickname,
    password,
    passwordAgain,
    gender,
    locale,
    birthday,
    description,
    application,
    registerIp: ctx.ip,
  })

  let auths = []
  let authOauth: ?Auth
  let authEmail: ?Auth
  let authPhone: ?Auth


  if ((validate = user.validateSync())) {
    throw validate
  }

  if (createType === 'email' || email) {
    authEmail = new Auth({
      column: 'email',
      value: email,
      user,
    })
    auths.push(authEmail)
  }

  if (createType === 'phone' || phone) {
    authPhone = new Auth({
      column: 'phone',
      value: phone,
      user,
    })
    auths.push(authPhone)
  }

  if (createType === 'column' || column) {
    if (!oauthConfig[column]) {
      ctx.throw(403, 'match', { path: 'column' })
    }
    let state: Object = token.get('state.auth.' + column) || {}
    let userInfo: Object = state.userInfo
    if (!userInfo || !userInfo.id || (Date.now() - 1800 * 10000) > state.createdAt.getTime()) {
      ctx.throw(401, 'notlogged', { column })
    }

    authOauth = new Auth({
      column,
      value: userInfo.id,
      user,
      token: state.accessToken,
      state: state.userInfo,
    })

    token.set('state.auth.' + column, undefined)
    auths.push(authOauth)


    // 没 email  自动添加
    if (!authEmail && userInfo.email && !(await Auth.findOne({ column: 'email', value: userInfo.email }).exec())) {
      auths.push(new Auth({
        column: 'email',
        value: userInfo.email,
        user,
      }))
    }

    // 取消密码设置
    if (params.password === undefined) {
      user.set('password', undefined)
      user.set('passwordAgain', undefined)
    }
  }


  if (!auths.length) {
    ctx.throw(403, 'required', { path: 'auth' })
  }

  for (let i = 0; i < auths.length; i++) {
    if ((validate = auths[i].validateSync())) {
      throw validate
    }
  }

  if (authEmail && !emailCode) {
    ctx.throw(403, 'required', { path: 'emailCode' })
  }

  if (authPhone && !phoneCode) {
    ctx.throw(403, 'required', { path: 'phoneCode' })
  }

  if ((validate = await user.validate())) {
    throw validate
  }

  for (let i = 0; i < auths.length; i++) {
    if ((validate = await auths[i].validate())) {
      throw validate
    }
  }

  if (authEmail && ctx.app.env !== 'development') {
    let verification  = await Verification.findByCode({
      token,
      type: 'user_save',
      code: emailCode,
      to: authEmail.get('value'),
      toType: 'email',
    })
    if (!verification) {
      ctx.throw(401, 'incorrect', { path: 'emailCode' })
    }
  }

  if (authPhone && ctx.app.env !== 'development') {
    let verification  = await Verification.findByCode({
      token,
      type: 'user_save',
      code: phoneCode,
      to: authPhone.get('value'),
      toType: 'sms',
    })
    if (!verification) {
      ctx.throw(401, 'incorrect', { path: 'phoneCode' })
    }
  }

  await user.save()
  if (params.avatar && typeof params.avatar === 'string') {
    try {
      user.set('avatar', params.avatar)
      user.set('preAvatar', true)
      await user.save()
    } catch (e) {
    }
  }

  await user.populate(User.metaPopulate(true)).execPopulate()

  try {
    for (let i = 0; i < auths.length; i++) {
      await auths[i].save()
    }
  } catch (e) {
    ctx.app.emit('error', e, ctx)
  }

  let authorize
  if (application) {
    authorize = await Authorize.findOneCreate(user, application)
  }

  token.set('user', user)
  token.set('authorize', authorize)
  await token.save()


  let message = new Message({
    user,
    type: 'user_save',
    create: true,
    column: column || undefined,
    token,
  })
  await message.save()

  message = new Message({
    user,
    type: 'user_login',
    column: column || undefined,
    token,
  })
  await message.save()

  ctx.vmState(token, 201)
}
