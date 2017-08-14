import User from 'models/user'
import Auth from 'models/auth'
import Message from 'models/message'
import Authorize from 'models/authorize'
import oauthConfig from 'config/oauth'

export default async function (ctx) {
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }
  var token = ctx.state.token
  var application = token.get('application')
  var user


  var column = String(params.column || '').toLowerCase().trim()
  if (column) {
    if (!oauthConfig[column]) {
      ctx.throw('认证字段不正确', 403)
    }
    let state = token.get('state.auth.' + column) || {}
    let userInfo = state.userInfo
    if (!userInfo || !userInfo.id || (Date.now() - 300 * 10000) > state.createdAt.getTime()) {
      ctx.throw('未登录认证帐号', 403, {column: true})
    }
    user = await User.findByAuth(userInfo.id, column)

    if (!user) {
      ctx.throw('Username does not exist', 404)
    }

    let auth = await Auth.findOne({user, column, value: userInfo.id, deletedAt: {$exists: false}}).exec()
    if (auth) {
      auth.set('token', state.accessToken)
      auth.set('state', state.userInfo)
      token.savePost(auth)
    }


    token.set('state.auth.' + column, void 0)
  } else {
    var username = String(params.username || '').toLowerCase().trim()
    var password = String(params.password || '');


    if (!username) {
      ctx.throw('Username can not be empty', 403)
    }

    if (!password) {
      ctx.throw('Password can not be empty', 403)
    }

    user = await User.findByAuth(username)

    if (!user) {
      ctx.throw('Username does not exist', 404)
    }
    if (!await user.comparePassword(password)) {
      var message = new Message({
        user,
        readOnly: true,
        type: 'auth_login',
        column,
        error: true,
        token,
      })
      await message.save()
      ctx.throw('Incorrect password', 403)
    }
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

  var message = new Message({
    user,
    readOnly: true,
    type: 'auth_login',
    column,
    token,
  })
  await message.save()

  ctx.vmState(token)
}
