import User from 'models/user'
import Meta from 'models/meta'
import Notification from 'models/notification'
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  await (new Notification({
    _id: '594e210d5cc916fe9dabccdb',
    user,
  })).setToken(token).canThrow('clear')

  var params = {...ctx.query, ...ctx.request.body}

  var query = {}

  query.user = user
  query.deletedAt = {$exists: false}

  if (!params.all) {
    query.readAt = {$exists: true}
  }

  var result = await Notification.update(query, {deletedAt: true}, {multi: true}).exec();

  await Meta.findByIdAndUpdate(user.get('_id'), {$set: {notification: 0}})

  await ctx.render(result)
}
