import User from 'models/user'
import Message from 'models/message'
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')

  var params = {...ctx.query, ...ctx.request.body}
  delete params.cans
  delete params.contact
  delete params.createdAt
  delete params.deletedAt

  delete params.userAgent
  delete params.ip

  for (let key in params) {
    let value = params[key]
    if (!key || /^[a-z][0-9a-zA-Z]*$/.test(key) || value === null || value === void 0 || typeof value === 'object') {
      delete params[key]
      continue
    }
    params[key] = String(value)
  }

  var message = new Message({
    ...params,
    user,
    application: token.get('application'),
    creator: tokenUser,
    readAt: params.readAt ? new Date : void 0,
    token,
  })

  await message.canThrow('save')
  await message.save()

  ctx.vmState(message)
}
