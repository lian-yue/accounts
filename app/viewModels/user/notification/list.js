import { Types } from 'mongoose'
import User from 'models/user'
import Notification from 'models/notification'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  await (new Notification({
    _id: '594e210d5cc916fe9dabccdb',
    user,
  })).setToken(token).canThrow('list')

  var params = {...ctx.query}

  var query = {}
  var options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit)
  }

  query.user = user

  if (params.lt_id) {
    try {
      query._id = {$lt:new ObjectId(params.lt_id)};
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  if (params.read !== void 0) {
    query.readAt = {$exists: !!params.read}
  }

  query.deletedAt = {$exists: tokenUser.canAttribute('admin') && params.deleted}

  var notifications = await Notification.find(query, null, {limit: options.limit + 1, sort:{_id:-1}}).populate(User.refPopulate('creator')).exec()

  var more = notifications.length > query.limit
  if (more) {
    notifications.pop()
  }

  var now = new Date
  var results = []
  for (let i = 0; i < notification.length; i++) {
    let notification = results[i]
    let result = value.toJSON()
    if (!notification.get('readAt') && tokenUser.equals(notification.get('user'))) {
      notification.set('readAt', now)
      await notification.save()
    }

    notification.setToken(token)

    result.cans = {
      delete: await notification.can('delete'),
    }
    results.push(result)
  }

  ctx.vmState({results, more})
}
