import Message from 'models/message'
export default async function (ctx, next) {
  var user = ctx.state.user
  if (ctx.params.id) {
    try {
      var message = await Message.findById(ctx.params.id).exec()
    } catch (e) {
      e.state =  404
      throw e
    }
    ctx.state.message = message
    if (!ctx.state.message) {
      ctx.throw('消息不存在', 404)
    }
    if (user && !user.equals(message.get('user'))) {
      ctx.throw('消息不存在', 404)
    }
  } else {
    delete ctx.state.message
  }
  await next()
}
