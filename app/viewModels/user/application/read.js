import Application from 'models/application'
export default async function (ctx, next) {
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var application = ctx.state.applicationState
  await application.setToken(token).canThrow('read')
  application.populate(Application.refPopulate('creator'))
  await  application.execPopulate()

  var result = application.toJSON()

  ctx.vmState({
    ...result,
    cans: {
      save: await application.can('save'),
      status: await application.can('status'),
      delete: await application.can('delete'),
      restore: await application.can('restore'),
    }
  })
}
