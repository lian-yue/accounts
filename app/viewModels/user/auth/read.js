export default async function (ctx, next) {
  var auth = ctx.state.auth
  var user = ctx.state.user
  var token = ctx.state.token
  await auth.setToken(token).canThrow('read')
  ctx.vmState({
    ...auth.toJSON(),
    cans: {
      save: await auth.can('save'),
      delete: await auth.can('delete'),
    }
  })
}
