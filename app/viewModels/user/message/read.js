import User from 'models/user'
export default async function (ctx, next) {
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var message = ctx.state.message
  await message.setToken(token).canThrow('read')
  message.populate(User.refPopulate('creator'))
  await  message.execPopulate()

  var result = message.toJSON()

  if (!message.get('readAt') && tokenUser.equals(message.get('user'))) {
    message.set('readAt', now)
    await message.save()
  }

  ctx.vmState({
    ...result,
    cans: {
      delete: await message.can('delete'),
    }
  })
}
