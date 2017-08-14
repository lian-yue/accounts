import Message from 'models/message'
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var params = {
    ...ctx.request.query,
  }
  if (ctx.request.body && typeof ctx.request.body == 'object') {
    Object.assign(params, ctx.request.body)
  }

  await user.setToken(token).canThrow('restore')

  user.set('black', false)
  user.set('reason', String(ctx.query.reason || ''))
  await user.save()


  var message = new Message({
    user,
    type: 'user_restore',
    creator: tokenUser,
    reason: user.get('reason'),
    token,
  })
  await message.save()


  ctx.vmState({})
}
