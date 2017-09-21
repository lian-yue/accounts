import { Types } from 'mongoose'
import Role from 'models/role'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  var token = ctx.state.token
  var application = ctx.state.applicationState
  await (new Role({
    _id: '594e210d5cc916fe9dabccdb',
    application,
  })).setToken(token).canThrow('list')


  var params = {...ctx.query}

  var query = {}
  var options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit)
  }

  if (params.lt_id) {
    try {
      query._id = {$lt:new ObjectId(params.lt_id)};
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  query.deletedAt = {$exists: !!params.deleted}

  if (params.search) {
    let search = String(params.search).replace(/[\u0000-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007f]+/g, ' ').split(' ').filter(value => !!value);
    if (search.length) {
      query.$and = query.$and || []
      for (let value of search) {
        query.$and.push({name:{$regex: value, $options:'i'}})
      }
    }
  }

  var results = await Role.find(query, null, {limit: options.limit + 1, sort:{_id:-1}}).exec()

  var more = results.length > options.limit
  if (more) {
    results.pop()
  }

  for (let i = 0; i < results.length; i++) {
    let value = results[i]
    value.setToken(token)
    let result = value.toJSON()
    result.cans = {
      save: await value.can('save'),
      delete: await value.can('delete'),
      restore: await value.can('restore'),
    }
    results[i] = result
  }
  ctx.vmState({results, more})
}
