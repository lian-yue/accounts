import Authorize from 'models/authorize'
export default async function (ctx, next) {
  var user = ctx.state.user
  if (ctx.params.id) {
    try {
      var authorize = await Authorize.findById(ctx.params.id).exec()
    } catch (e) {
      e.state =  404
      throw e
    }
    ctx.state.authorize = authorize
    if (!ctx.state.authorize) {
      ctx.throw('认证不存在', 404)
    }
    if (user && !user.equals(authorize.get('user'))) {
      ctx.throw('认证不存在', 404)
    }
  } else {
    delete ctx.state.authorize
  }
  await next()
}
