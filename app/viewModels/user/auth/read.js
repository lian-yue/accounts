export default async function (ctx, next) {
  var auth = ctx.state.auth
  var token = ctx.state.token
  await auth.setToken(token).canThrow('read')
  ctx.vmState({
    ...auth.toJSON(),
    cans: {
      save: await auth.can('save'),
      delete: await auth.can('delete'),
      verification: await auth.can('verification'),
    }
  })
}
