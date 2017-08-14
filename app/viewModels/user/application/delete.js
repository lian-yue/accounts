import Message from 'models/message'
export default async function (ctx) {
  var token = ctx.state.token
  var application = ctx.state.applicationState
  var params = {
    ...ctx.request.query,
  }
  if (ctx.method == 'POST') {
    Object.assign(params, ctx.request.body)
  }
  await application.setToken(token).canThrow('delete')


  application.set('reason', String(params.reason || ''))
  application.set('deletedAt', new Date)
  await application.save()


  var message = new Message({
    user: application.get('creator'),
    type: 'application_delete',
    creator: tokenUser,
    readAt: user.equals(tokenUser) ? new Date, void 0,
    reason: application.get('reason'),
    token,
  })
  await message.save()

  ctx.vmState(application, 204)
}
