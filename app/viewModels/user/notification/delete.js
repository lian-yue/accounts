export default async function (ctx) {
  var token = ctx.state.token
  var notification = ctx.state.notification
  await notification.setToken(token).canThrow('delete')


  notification.set('deletedAt', new Date)
  await notification.save()

  ctx.status = 204
  ctx.vmState(notification)
}
