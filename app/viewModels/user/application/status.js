import Message from 'models/message'
export default async function (ctx) {
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var application = ctx.state.applicationState
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }
  await application.setToken(token).canThrow('status')

  application.set('reason', String(params.reason || ''))
  application.set('status', String(params.status || 'status'))
  await application.save()

  var message = new Message({
    user: application.get('creator'),
    type: 'application_status',
    creator: tokenUser,
    readAt: user.equals(tokenUser) ? new Date, void 0,
    status: application.get('status'),
    reason: application.get('reason'),
    token,
  })
  await message.save()

  ctx.vmState({})
}
