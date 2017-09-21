import User from 'models/user';
import Auth from 'models/auth'
import Verification from 'models/verification';
import site from 'config/site';


export default async function(ctx) {

  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  var id = String(body.id || '')

  var token = ctx.state.token

  if (!id) {
    ctx.throw('ID 不能为空', 403);
  }

  var auth
  try {
    auth = await Auth.findById(id).populate('user').exec();
  } catch (e) {
    e.status = 403
    throw e
  }

  if (!auth || auth.get('deletedAt') || ['email', 'phone'].indexOf(auth.get('column')) == -1) {
    ctx.throw('ID 不存在', 404);
  }

  var user = auth.get('user')

  // 用户不存在
  if (!user) {
    ctx.throw('用户不存在', 404)
  }

  var verification = new Verification({
    ip: ctx.ip,
    user,
    token,
    type: 'user_password',
    to: auth.get('value'),
    toType: auth.get('column') == 'phone' ? 'sms' : auth.get('column'),
    nickname: user.get('nickname') || user.get('username'),
    used: '修改密码',
  })

  await verification.save()

  ctx.vmState(verification)
}
