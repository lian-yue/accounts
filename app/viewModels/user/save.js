import User from 'models/user'
import Message from 'models/message'

export default async function (ctx) {
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
  await user.setToken(token).canThrow('save')


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

  var data = {}
  if (!isNew) {
    for (let i = 0; i < paths.length; i++) {
      let path = paths[i]
      if (path.indexOf('.') != -1 || ['meta', '_id', 'registerIp'].indexOf(path) != -1) {
        continue
      }
      data[path] = path == 'password' ? '***' : user.get(path)
    }
  }

  var message = new Message({
    user,
    creator: tokenUser,
    type: 'user_save',
    create: isNew,
    readOnly: true,
    data,
    token,
  })
  await message.save()

  ctx.vmState(user)
}
