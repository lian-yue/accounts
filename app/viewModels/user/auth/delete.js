import Auth from 'models/auth'
import Message from 'models/message'
import Application from 'models/application'
import Verification from 'models/verification'
import oauthConfig from 'config/oauth'

export default async function (ctx) {
  var auth = ctx.state.auth
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var params = {
    ...ctx.request.query,
  }
  if (ctx.request.body && typeof ctx.request.body == 'object') {
    Object.assign(params, ctx.request.body)
  }

  await auth.setToken(token).canThrow('delete')

  const column = auth.get('column')
  const isAdmin = !tokenUser.equals(auth.get('user'))


  // 必须保留一个的
  if ((column == 'email' || column == 'phone') && !await Auth.findOne({user: auth.get('user'), _id:{$ne:auth.get('_id')}, column, deletedAt:{$exists:false}}).exec()) {
    ctx.throw('必须保留一个' + (column == 'email' ? '电子邮箱': '手机号'), 403)
  }

  // 没密码必须保留个 oauth 登录
  if (oauthConfig[column] && !user.get('password') && !await Auth.findOne({user: auth.get('user'), _id:{$ne:auth.get('_id')}, column:{$in:Object.keys(oauthConfig)}, deletedAt:{$exists:false}}).exec()) {
    ctx.throw('你还没设置密码，必须保留一个绑定账号', 403)
  }

  if (await auth.can('verification')) {
    // 不需要认证的
  } else if (column == 'phone' || column == 'email') {
    // 手机 邮箱
    if (!params.code) {
      ctx.throw('验证码不能为空', 403);
    }
    var verification = await Verification.findByCode({
      token,
      type: 'auth_delete',
      code: params.code,
      user: auth.get('user'),
      to: auth.get('value'),
      toType: column == 'phone' ? 'sms' : column,
    })
    if (!verification && ctx.app.env != 'development') {
      ctx.throw('验证码不正确', 403);
    }
  } else {
    // 其他需要输入登陆密码
    if (user.get('password') && !await user.comparePassword(params.password || '')) {
      ctx.throw('密码错误', 403)
    }
  }

  auth.set('deletedAt', new Date)
  await auth.save()

  var message = new Message({
    user: auth.get('user'),
    creator: tokenUser,
    application: token.get('application'),
    type: 'auth_delete',
    readOnly: true,
    auth: auth.get('_id'),
    display: auth.get('display'),
    token,
  })
  await message.save()
  ctx.vmState(auth, 204)
}
