import Verification from 'models/verification';

export default async function(ctx) {
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  var to = String(params.to || '').trim()
  var toType = String(params.to_type || '').trim()

  var token = ctx.state.token

  var verification = new Verification({
    ip: ctx.ip,
    token,
    type: 'user_save',
    toType: toType == 'phone' ? 'sms' : toType,
    to,
    nickname: '尊敬的用户',
    used: '注册帐号',
  })

  await verification.save()

  ctx.vmState(verification);
}
