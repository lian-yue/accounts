import Application from 'models/application'
export default async function (ctx, next) {
  var user = ctx.state.user
  if (ctx.params.id) {
    try {
      var application = await Application.findById(ctx.params.id).exec()
    } catch (e) {
      e.state =  404
      throw e
    }
    ctx.state.applicationState = application
    if (!ctx.state.applicationState) {
      ctx.throw('应用不存在', 404)
    }
    if (user && !application.get('creator').equals(user)) {
      ctx.throw('应用不存在', 404)
    }
  } else {
    delete ctx.state.applicationState
  }
  await next()
}
