import { Types } from 'mongoose'
import Authorize from 'models/authorize'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  await (new Authorize({
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
      query._id = {$lt:new ObjectId(params.lt_id)}
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  query.deletedAt = {$exists: tokenUser.get('admin') && params.deleted ? true : false}


  var authorizes = await Authorize.find(query, null, {limit: options.limit + 1, sort:{_id:-1}}).populate('application').exec()

  var more = authorizes.length > options.limit
  if (more) {
    authorizes.pop()
  }


  var results = []
  for (let i = 0; i < authorizes.length; i++) {
    let authorize = authorizes[i]
    let result = authorizes.toJSON()
    authorize.setToken(token)

    result.cans = {
      delete: await authorize.can('delete'),
    }
    results.push(result)
  }
  ctx.vmState({results, more})
}
