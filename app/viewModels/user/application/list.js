import { Types } from 'mongoose'
import User from 'models/user'
import Application from 'models/application'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  await (new Application({
    _id: '594e210d5cc916fe9dabccdb',
    creator: user,
  })).setToken(token).canThrow('list')


  var params = {...ctx.query}

  var query = {}
  var options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit)
  }

  if (user) {
    query.creator = user
  }

  if (params.lt_id) {
    try {
      query._id = {$lt:new ObjectId(params.lt_id)};
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  query.deletedAt = {$exists: tokenUser.get('admin') && params.deleted ? true : false}

  if (params.status && (params.status != 'block' || tokenUser.get('admin') || tokenUser.equals(user))) {
    query.status = String(params.status)
  } else if (!tokenUser.get('admin') && !tokenUser.equals(user)) {
    query.status = {$in: ['release', 'pending']}
  }

  if (params.search) {
    let search = String(params.search).replace(/[\u0000-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007f]+/g, ' ').split(' ').filter(value => !!value);
    if (search.length) {
      query.$and = query.$and || []
      for (let value of search) {
        query.$and.push({name:{$regex: value, $options:'i'}})
      }
    }
  }

  var results = await Application.find(query, null, {limit: options.limit + 1, sort:{_id:-1}}).populate(User.refPopulate('creator')).exec()

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
      status: await value.can('status'),
      delete: await value.can('delete'),
      restore: await value.can('restore'),
    }
    results[i] = result
  }
  ctx.vmState({results, more})
}
