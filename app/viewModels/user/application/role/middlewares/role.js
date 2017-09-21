import Role from 'models/role'
export default async function (ctx, next) {
  var application = ctx.state.applicationState
  if (ctx.params.role) {
    try {
      var role = await Role.findById(ctx.params.role).exec()
    } catch (e) {
      e.state =  404
      throw e
    }
    ctx.state.role = role
    if (!ctx.state.role) {
      ctx.throw('角色不存在', 404)
    }
    if (application && !application.equals(role.get('application'))) {
      ctx.throw('角色不存在', 404)
    }
  } else {
    delete ctx.state.role
  }
  await next()
}
