import User from 'models/user'
export default async function (ctx, next) {
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var application = ctx.state.applicationState
  await application.setToken(token).canThrow('read')
  application.populate(User.refPopulate('creator'))
  await  application.execPopulate()

  var result = application.toJSON()
  if (ctx.query.cans || ctx.query.cans === void 0) {
    result.cans = {
      save: await application.can('save'),
      status: await application.can('status'),
      delete: await application.can('delete'),
      restore: await application.can('restore'),
      scope: await application.can('scope'),
      auths_password: await application.can('auths_password'),
      auths_implicit: await application.can('auths_implicit'),
      auths_cors: await application.can('auths_cors'),
    }
  } else {
    result.cans = {}
  }
  ctx.vmState(result)
}
