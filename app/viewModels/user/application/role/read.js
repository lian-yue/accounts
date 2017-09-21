export default async function (ctx, next) {
  var token = ctx.state.token
  var role = ctx.state.role
  await role.setToken(token).canThrow('read')


  ctx.vmState({
    ...role.toJSON(),
    cans: {
      save: await role.can('save'),
      delete: await role.can('delete'),
      restore: await role.can('restore'),
    }
  })
}
