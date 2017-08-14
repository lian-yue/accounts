export default async function (ctx, next) {
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var authorize = ctx.state.authorize
  await authorize.setToken(token).canThrow('read')
  authorize.populate('application')
  await  authorize.execPopulate()

  var result = authorize.toJSON()

  ctx.vmState({
    ...result,
    cans: {
      delete: await authorize.can('delete'),
    }
  })
}
