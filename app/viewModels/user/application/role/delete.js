import Message from 'models/message'
export default async function (ctx) {
  var token = ctx.state.token
  var role = ctx.state.role
  var application = ctx.state.applicationState
  var params = {
    ...ctx.request.query,
  }
  if (ctx.method == 'POST') {
    Object.assign(params, ctx.request.body)
  }
  await role.setToken(token).canThrow('delete')

  role.set('deletedAt', new Date)
  await role.save()

  var message = new Message({
    user: application.get('creator'),
    type: 'role_delete',
    readOnly: true,
    roleId: role.get('_id'),
    name: role.get('name'),
    creator: tokenUser,
    readAt: tokenUser.equals(application.get('creator')) ? new Date : void 0,
    token,
  })
  await message.save()

  ctx.vmState(role, 204)
}
