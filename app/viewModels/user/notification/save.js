import User from 'models/user'
import Notification from 'models/notification'
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var application = ctx.state.application
  if (Boolean(application) != Boolean(token.get('application'))) {
    ctx.throw('Application 不正确')
  }

  var params = {...ctx.query, ...ctx.request.body}
  delete params.type
  delete params.path
  delete params.cans
  delete params.createdAt
  delete params.deletedAt
  for (let key in params) {
    let value = params[key]
    if (!key || /^[a-z][0-9a-zA-Z]*$/.test(key) || value === null || value === void 0 || typeof value === 'object') {
      delete params[key]
      continue
    }
    params[key] = String(value)
  }

  var notification = new Notification({
    ...params,
    user,
    creator: params.creator !== void 0 && !params.creator ? void 0 : tokenUser
    application,
    readAt: params.readAt ? new Date : void 0
  })

  await notification.canThrow('save')
  await notification.save()

  ctx.vmState(notification)
}
