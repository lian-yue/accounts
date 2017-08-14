import * as validator from 'models/validator';
import User from 'models/user'
import Auth from 'models/auth'

export default async function(ctx) {
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  var username = String(params.username || '').trim()

  if (!username) {
    ctx.throw('帐号不能为空', 403)
  }

  var user = await User.findByAuth(username)

  if (!user) {
    ctx.throw('用户不存在', 404)
  }

  var auths = await Auth.find({user, column: {$in:['email', 'phone']}, deletedAt: {$exists: false}}).exec();

  ctx.vmState({
    ...user.toJSON(),
    auths: auths.toJSON(),
  })
}
