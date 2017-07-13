import Auth from 'models/aurh'
import oauth from 'config/oauth'
export default async function (ctx, next) {
  var auth = ctx.state.auth
  var token = ctx.state.token
  await auth.setToken(token).canThrow('delete')


  var column = auth.get('column')
  var isOAuth = oauth[column]


  // 必须保留一个的
  if ((column == 'email' || column == 'phone') && !await Auth.findOne({user: auth.get('user'), _id:{$ne:auth.get('_id')}, column, deletedAt:{$exists:false}}).exec()) {
    ctx.throw('必须保留一个' + (column == 'email' ? '电子邮箱': '手机号'), 403)
  }


  // 没密码必须保留个 oauth 登录
  if (isOAuth && !user.get('password') && !await Auth.findOne({user: auth.get('user'), _id:{$ne:auth.get('_id')}, column:{$in:Object.keys(oauth)}, deletedAt:{$exists:false}}).exec()) {
    ctx.throw('你还没设置密码，必须保留一个绑定账号', 403)
  }

  if (isOAuth) {
    var password
    if (ctx.request.body instanceof Object && ctx.request.body.password) {
      password = ctx.request.body.password
    } else {
      password = ctx.request.query.password
    }
    if (user.get('password') && !await user.comparePassword(password || '')) {
      e = new Error('密码错误');
      e.code = 'ValidatorError';
      throw e;
    }
  } else {


  auth.set('deletedAt', new Date)
  await auth.save()

  ctx.status = 204
  ctx.vmState(auth)
}
