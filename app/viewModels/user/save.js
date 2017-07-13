import User from 'models/user'
import Log from 'models/log'

export default async function (ctx) {
  // canThrow
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }
  if (!user) {
    user = new User({
      application: token.get('application'),
      creator: tokenUser,
    })
  }
  user.setToken(token)

  await user.canThrow('save')

  // 密码
  if (user.isNew) {
    this.set('password', String(params.password || ''))
    this.set('passwordAgain', String(params.password_again || ''))
  } else if (params.old_password || params.new_password || params.new_password_again) {
    await user.canThrow('password')
    if (tokenUser.equals(user)) {
      this.set('oldPassword', String(params.old_password || ''))
    }
    this.set('password', String(params.new_password || ''))
    this.set('newPassword', String(params.new_password || ''))
    this.set('newPasswordAgain', String(params.new_password_again || ''))
  }

  // 用户名
  if (typeof params.username == 'string') {
    await user.canThrow('username')
    user.set('username', params.username)
  }

  // 名称
  if (typeof params.nickname == 'string') {
    user.set('nickname', params.nickname)
  }

  // 区域
  if (typeof params.locale == 'string') {
    user.set('locale', params.locale)
  }

  // 描述
  if (typeof params.description == 'string') {
    user.set('description', params.description)
  }

  // 性别
  if (typeof params.gender == 'string') {
    user.set('gender', params.gender)
  }

  // 生日
  if (params.birthday) {
    let birthday = new Date(params.birthday)
    if (!isNaN(birthday)) {
      user.set('birthday', birthday)
    }
  }

  if (typeof params.avatar == 'string') {
    user.set('avatar', avatar)
  }

  var paths = user.modifiedPaths()
  var isNew = user.isNew

  await user.save()

  if (isNew) {
    var data = {}
    for (let i = 0; i < paths.length; i++) {
      let path = paths[i]
      if (path.indexOf('.') != -1 || ['meta', '_id', 'registerIp'].indexOf(path) != -1) {
        continue
      }
      data[path] = path == 'password' ? '***' : user.get(path)
    }

    var log = new Log({
      user,
      token,
      creator: tokenUser.equals(user) ? void 0 : tokenUser,
      application: token.get('application'),
      userAgent: ctx.request.header['user-agent'] || '',
      path: 'user/save',
      ip: ctx.ip,
      data,
      create: isNew,
    })
    await log.save()
  }
  ctx.vmState(user)
}
