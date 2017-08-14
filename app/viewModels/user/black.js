import Message from 'models/message'
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  await user.setToken(token).canThrow('black')

  user.set('black', true)
  user.set('reason', String(params.reason || ''))
  await user.save()


  var message = new Message({
    user,
    type: 'user_black',
    creator: tokenUser,
    reason: user.get('reason'),
    token,
  })
  await message.save()


  ctx.vmState({})
}
