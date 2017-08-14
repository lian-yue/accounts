export default async function (ctx) {
  var token = ctx.state.token
  var message = ctx.state.message
  await message.setToken(token).canThrow('delete')


  message.set('deletedAt', new Date)
  await message.save()

  ctx.vmState(message, 204)
}
