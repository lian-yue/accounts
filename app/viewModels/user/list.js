import { Types } from 'mongoose'
import User from 'models/user'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  // canThrow
  var token = ctx.state.token
  var tokenUser = token.get('user')
  await tokenUser.setToken(token).canThrow('list')

  var params = {...ctx.query}

  var query = {}
  var options = {
    limit: 50,
  }


  if (params.limit && params.limit <= 200 && params.limit >= 1) {
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

  if (params.username) {
    query.username = String(params.username).trim()
  }

  if (params.admin) {
    query.admin = true
  }

  if (params.black) {
    query.black = true
  }

  var results = User.find(query, null, {limit: options.limit + 1, sort:{_id:-1}}).populate(User.metaPopulate())
  if (tokenUser.get('admin')) {
    results = results.populate(User.refPopulate('creator')).populate(User.refPopulate('updater')).populate({path: 'application', select: {name: 1, slug: 1, content: 1}})
  }
  results = await results.exec()

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
      black: await value.can('black'),
      restore: await value.can('restore'),
    }
    results[i] = result
  }
  ctx.vmState({results, more})
}
