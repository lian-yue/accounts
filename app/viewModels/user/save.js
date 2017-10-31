/* @flow */
import User from 'models/user'
import Message from 'models/message'

import type { Context } from 'koa'
import type Token from 'models/token'

export default async function (ctx: Context) {
  let user: ?User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let params = {
    ...ctx.request.query,
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }
  if (!user) {
    user = new User({
      application: token.get('application'),
      creator: tokenUser,
    })
  }
  await user.setToken(token).can('save')


  // 密码
  if (user.isNew) {
    this.set('password', String(params.password || ''))
    this.set('passwordAgain', String(params.password_again || ''))
  } else if (params.old_password || params.new_password || params.new_password_again) {
    await user.can('save', { password: true })
    if (tokenUser.equals(user)) {
      this.set('oldPassword', String(params.old_password || ''))
    }
    this.set('password', String(params.new_password || ''))
    this.set('newPassword', String(params.new_password || ''))
    this.set('newPasswordAgain', String(params.new_password_again || ''))
  }

  // 用户名
  if (typeof params.username === 'string') {
    await user.can('save', { username: true })
    user.set('username', params.username)
  }

  // 名称
  if (typeof params.nickname === 'string') {
    user.set('nickname', params.nickname)
  }

  // 区域
  if (typeof params.locale === 'string') {
    user.set('locale', params.locale)
  }

  // 描述
  if (typeof params.description === 'string') {
    user.set('description', params.description)
  }

  // 性别
  if (typeof params.gender === 'string') {
    user.set('gender', params.gender)
  }

  // 生日
  if (params.birthday) {
    let birthday = new Date(params.birthday)
    if (!isNaN(birthday)) {
      user.set('birthday', birthday)
    }
  }

  if (typeof params.avatar === 'string') {
    user.set('avatar', params.avatar)
    user.set('preAvatar', !!params.avatar)
  }

  let paths = user.modifiedPaths()
  let isNew = user.isNew

  await user.save()

  let data = {}
  if (!isNew) {
    for (let i = 0; i < paths.length; i++) {
      let path = paths[i]
      if (path.indexOf('.') !== -1 || ['meta', '_id', 'registerIp', 'password'].indexOf(path) !== -1) {
        continue
      }
      data[path] = user.get(path)
    }
  }

  let message = new Message({
    user,
    contact: user,
    creator: tokenUser,
    type: 'user_save',
    create: isNew,
    data,
    token,
  })
  await message.save()

  if (!isNew && paths.indexOf('password') !== -1) {
    let message2 = new Message({
      user,
      contact: user,
      creator: tokenUser,
      type: 'user_password',
      data,
      token,
    })
    await message2.save()
  }

  ctx.vmState(user)
}
