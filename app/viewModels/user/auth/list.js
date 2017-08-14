import { Types } from 'mongoose'
import Auth from 'models/auth'


const ObjectId = Types.ObjectId

export default async function (ctx, next) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')

  var params = {...ctx.query}
  await (new Auth({
    _id: '594e210d5cc916fe9dabccdb',
    user,
  })).setToken(token).canThrow('list')

  var query = {}
  var options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit)
  }

  if (user) {
    query.user = user
  }

  if (params.column) {
    query.column = String(params.column)
  }

  if (params.value) {
    query.column = String(params.column)
    query.value = String(params.value)
  }

  query.deletedAt = {$exists: params.deleted && tokenUser.get('admin') ? true : false}


  if (params.lt_id) {
    try {
      query._id = {$lt:new ObjectId(params.lt_id)};
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  var results = await Auth.find(query, null, {limit: options.limit + 1, sort:{_id:-1}}).exec()

  var more = results.length > query.limit
  if (more) {
    results.pop()
  }

  for (let i = 0; i < results.length; i++) {
    let value = results[i];
    value.setToken(token)
    let result = value.toJSON()
    result.cans = {
      save: await value.can('save'),
      delete: await value.can('delete'),
      verification: await value.can('verification'),
    }
    results[i] = result
  }

  ctx.vmState({results, more})
}
