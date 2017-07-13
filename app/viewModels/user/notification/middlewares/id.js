import Notification from 'models/notification'
export default async function (ctx, next) {
  var user = ctx.state.user
  var token = ctx.state.token
  if (ctx.params.id) {
    try {
      var notification = await Notification.findById(ctx.params.id).exec()
    } catch (e) {
      e.state =  404
      throw e
    }
    ctx.state.notification = notification
    if (!ctx.state.notification) {
      ctx.throw('消息不存在', 404)
    }
  } else {
    delete ctx.state.notification
  }
  await next()
}
