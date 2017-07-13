import Notification from 'models/notification'
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

  var attributes = user.get('attributes')
  var index = attributes.indexOf('black')
  if (index != -1) {
    attributes.splice(index, 1)
    user.set('attributes', attributes)
  }

  if (user.isModified()) {
    user.set('reason', ctx.query.reason)
    await user.save()
  }

  // 通知
  var notification = new Notification({
    user,
    creator: tokenUser,
    reason: String(params.reason),
    message: '您的账号被管理员"{CREATOR}"恢复正常使用。 理由：{REASON}',
  })
  await notification.save()

  await ctx.render({})
}
