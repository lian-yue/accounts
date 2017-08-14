import { Types } from 'mongoose'
import User from 'models/user'
import Message from 'models/message'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  await (new Message({
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

  if (params.readOnly !== void 0) {
    query.readOnly = Boolean(params.readOnly)
  }

  if (params.read !== void 0) {
    query.readAt = {$exists: !!params.read}
  }

  if (params.contact) {
    try {
      query.contact = new ObjectId(params.contact)
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  if (params.creator) {
    try {
      query.creator = new ObjectId(params.creator)
    } catch (e) {
      e.status = 403
      throw e
    }
  }


  query.deletedAt = {$exists: tokenUser.get('admin') && params.deleted ? true : false}

  var messages = await Message.find(query, null, {limit: options.limit + 1, sort:{_id:-1}}).populate(User.refPopulate('creator')).exec()

  var more = messages.length > options.limit
  if (more) {
    messages.pop()
  }

  var now = new Date
  var results = []
  for (let i = 0; i < messages.length; i++) {
    let message = messages[i]
    let result = message.toJSON()
    if (!message.get('readAt') && tokenUser.equals(message.get('user'))) {
      message.set('readAt', now)
      await message.save()
    }

    message.setToken(token)

    result.cans = {
      delete: await message.can('delete'),
    }
    results.push(result)
  }

  ctx.vmState({results, more})
}
