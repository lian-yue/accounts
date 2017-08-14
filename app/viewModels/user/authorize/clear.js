import { Types } from 'mongoose'
import Authorize from 'models/authorize'
import Token from 'models/token'

const ObjectId = Types.ObjectId

export default async function (ctx, next) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var authorize = ctx.state.authorize
  if (authorize) {
    await authorize.setToken(token).canThrow('clear')
  } else {
    await (new Authorize({
      _id: '594e210d5cc916fe9dabccdb',
      user,
    })).setToken(token).canThrow('clear')
  }

  var query = {}
  var date = new Date
  query.user = user
  if (authorize) {
    query.authorize = authorize
  }
  query._id = {$ne: token.get('_id')}
  query.createdAt = {$lt: date}
  query.deletedAt = {$exists: false}


  // 删除当前 token
  if (user.equals(token.get('user')) && (!authorize || authorize.equals(token.get('authorize')))) {
    token.set('deletedAt', date)
    await token.save()
  }

  await Token.updateMany(query, {$set:{deletedAt: date}}, {w: 0}).exec()

  ctx.vmState({})
}
