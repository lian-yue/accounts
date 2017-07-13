import Notification from 'models/notification'
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  await user.setToken(token).canThrow('black')

  var attributes = user.get('attributes').concat(['black'])
  user.set('attributes', attributes)
  user.set('reason', params.reason)
  await user.save()


  var notification = new Notification({
    user,
    creator: tokenUser,
    reason: String(params.reason),
    message: '您的账号被管理员"{CREATOR}"禁用。理由：{REASON}',
  })

  await notification.save()

  await ctx.render({})
}
