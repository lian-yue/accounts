import Application from 'models/application'
export default async function (ctx, next) {
  var user = ctx.state.user
  if (ctx.params.application) {
    if (/^[0-9a-z]{24}$/.test(ctx.params.application)) {
      var application = await Application.findById(ctx.params.application).exec()
    } else {
      var application = await Application.findOne({slug: ctx.params.application}).exec()
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
