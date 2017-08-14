import User from 'models/user'
import Meta from 'models/meta'
import Message from 'models/message'
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  await (new Message({
    _id: '594e210d5cc916fe9dabccdb',
    user,
  })).setToken(token).canThrow('clear')

  var params = {...ctx.query, ...ctx.request.body}

  var date = new Date
  var query = {}

  query.user = user
  query.createdAt = {$lt: date}
  query.deletedAt = {$exists: false}
  query.readOnly = false

  if (!params.all) {
    query.readAt = {$exists: true}
  }

  var result = await Message.updateMany(query, {$set:{deletedAt: date}}, {w: 0}).exec()

  await Meta.findByIdAndUpdate(user.get('_id'), {$set: {message: 0}})

  ctx.vmState(result)
}
