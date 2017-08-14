import User from 'models/user'
import Verification from 'models/verification'
export default async function (ctx) {
  var auth = ctx.state.auth
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  var used
  var type
  var to
  var toType
  if (auth) {
    // 删除权限
    await auth.setToken(token).canThrow('delete')
    type = 'auth_delete'
    to = auth.get('value')
    toType = auth.get('column')
    if (toType == 'phone') {
      used = '解除手机绑定'
    } else {
      used = '解除邮箱绑定'
    }
  } else {
    type = 'auth_save'
    to = (body.to || '').toString().trim()
    toType = (body.to_type || '').toString().trim()
    if (toType == 'phone') {
      used = '绑定手机'
    } else {
      used = '绑定邮箱'
    }
  }


  if (!user) {
    if (auth) {
      user = await User.findById(auth.get('user')).exec()
    } else {
      user = token.get('user')
    }
  }

  var verification = new Verification({
    token,
    user,
    type,
    toType: toType == 'phone' ? 'sms' : toType,
    to,
    nickname: user.get('nickname') || user.get('username'),
    used,
    ip: ctx.ip,
  })

  await verification.save();

  ctx.vmState(verification)
}
