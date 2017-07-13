import { Types } from 'mongoose'
import Log from 'models/log'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  await (new Log({
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


  var results = await Log.find(query, null, {limit: options.limit + 1, sort:{_id:-1}}).exec()

  var more = results.length > query.limit
  if (more) {
    results.pop()
  }

  ctx.vmState({results: results.toJSON(), more})
}
