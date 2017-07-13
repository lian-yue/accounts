import Log from 'models/log'
import User from 'models/user'
import Authorize from 'models/authorize'

export default async function (ctx) {
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }
  var token = ctx.state.token
  var application = token.get('application')
  var username = String(params.username || '').toLowerCase().trim()
  var password = String(params.password || '');


  if (!username) {
    ctx.throw('Username can not be empty', 403)
  }

  if (!password) {
    ctx.throw('Password can not be empty', 403)
  }

  var user = await User.findByUsername(username, true)

  if (!user) {
    ctx.throw('Username does not exist', 404)
  }

  if (!await user.comparePassword(password)) {
    var log = new Log({
      user,
      token,
      application,
      userAgent: ctx.request.header['user-agent'] || '',
      type: 'error',
      path: 'auth/login',
      ip: ctx.ip,
    })
    await log.save()
    ctx.throw('Incorrect password', 403)
  }

  await user.populate(User.metaPopulate(true)).execPopulate()

  // 不允许登录
  if (!await user.setToken(token).can('login')) {
    ctx.throw(`Your account is blocked because of "${user.get('reason')}"`, 403, {black: true})
  }

  var authorize
  if (application) {
    authorize = await Authorize.findOneCreate(user, application)
  }

  token.set('user', user)
  token.set('authorize', authorize)

  await token.save()

  var log = new Log({
    user,
    token,
    application,
    userAgent: ctx.request.header['user-agent'] || '',
    path: 'auth/login',
    ip: ctx.ip,
  })
  await log.save()

  ctx.vmState(token)
}
