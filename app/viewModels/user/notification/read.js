import User from 'models/user'
export default async function (ctx, next) {
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var notification = ctx.state.notification
  await notification.setToken(token).canThrow('read')
  notification.populate(User.refPopulate('creator'))
  await  notification.execPopulate()

  var result = notification.toJSON()

  if (!notification.get('readAt') && tokenUser.equals(notification.get('user'))) {
    notification.set('readAt', now)
    await notification.save()
  }

  ctx.vmState({
    ...result,
    cans: {
      delete: await notification.can('delete'),
    }
  })
}
