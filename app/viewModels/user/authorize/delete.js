export default async function (ctx) {
  var token = ctx.state.token
  var authorize = ctx.state.authorize
  await authorize.setToken(token).canThrow('delete')


  authorize.set('deletedAt', new Date)
  await authorize.save()

  ctx.vmState(authorize, 204)
}
