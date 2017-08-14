import Auth from 'models/auth'
import Message from 'models/message'
import Verification from 'models/verification'

import oauthConfig from 'config/oauth'
export default async function (ctx) {
  var auth = ctx.state.auth
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }
  if (!auth) {
    auth = new Auth({
      user: user || tokenUser,
    })
  }
  ctx.state.rateLimit = false
  await auth.setToken(token).canThrow('save')


  for (let key in params) {
    let value = params[key]
    if (!key || /^[a-z][0-9a-zA-Z]*$/.test(key) || value === null || value === void 0 || typeof value === 'object') {
      delete params[key]
      continue
    }
    params[key] = String(value)
  }

  if (params.settings) {
    if (typeof params.settings != 'object') {
      try {
        params.settings = JSON.parse(params.settings)
      } catch (e) {
        e.status = 403
        throw e
      }
    }
    if (params.settings && typeof params.settings == 'object' && !Array.isArray(params.settings)) {
      auth.set('settings', params.settings)
    }
  }

  if (auth.isNew) {
    const isAdmin = !tokenUser.equals(auth.get('user'))

    ctx.state.rateLimit = true
    var column = String(params.column)
    auth.set('column', column)

    if (column == 'email' || column == 'phone') {
      auth.set('value', params.value)

      var validate
      if (validate = auth.validateSync()) {
        throw validate;
      }

      if (!params.code) {
        ctx.throw('验证码不能为空', 403);
      }

      var verification = await Verification.findByCode({
        token,
        type: 'auth_save',
        code: params.code,
        user: auth.get('user'),
        to: auth.get('value'),
        toType: auth.get('column') == 'phone' ? 'sms' : auth.get('column'),
      })
      if (!verification && ctx.app.env != 'development') {
        ctx.throw('验证码不正确', 403);
      }
    } else if (oauthConfig[column]) {
      let state = token.get('state.auth.' + column) || {}
      let userInfo = state.userInfo
      if (!userInfo || !userInfo.id || (Date.now() - 300 * 10000) > state.createdAt.getTime()) {
        ctx.throw('未登录认证帐号', 403, {oauth: true})
      }
      token.set('state.auth.' + column, void 0)

      auth.set('value', userInfo.id)
      auth.set('token', state.accessToken)
      auth.set('state', state.userInfo)
      auth.savePost(token)
    } else {
      ctx.throw('绑定的字段不正确', 403)
    }


    var message = new Message({
      user: auth.get('user'),
      creator: tokenUser,
      application: token.get('application'),
      type: 'auth_save',
      readOnly: true,
      display: auth.get('display'),
      token,
    })
    auth.savePost(message)
  }
  await auth.save()
}
