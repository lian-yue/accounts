import Auth from 'models/auth'
export default async function (ctx, next) {
  var user = ctx.state.user
  var token = ctx.state.token
  if (ctx.params.id) {
    try {
      var auth = await Auth.findById(ctx.params.id).exec()
    } catch (e) {
      e.state =  404
      throw e
    }
    ctx.state.auth = auth
    if (!ctx.state.auth) {
      ctx.throw('认证不存在', 404)
    }
    if (user && !user.equals(auth.get('user'))) {
      ctx.throw('认证不存在', 404)
    }
  } else {
    delete ctx.state.auth
  }
  await next()
}
