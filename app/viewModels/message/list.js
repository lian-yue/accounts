/* @flow */
import { Types } from 'mongoose'
import User from 'models/user'
import Message from 'models/message'

import type { Context } from 'koa'
import type Token from 'models/token'

const ObjectId = Types.ObjectId

export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: Token = token.get('user')
  let canMessage = new Message({
    _id: '594e210d5cc916fe9dabccdb',
    user,
  })
  canMessage.setToken(token).can('list')

  let params = { ...ctx.query }

  let query = {}
  let options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit, 10)
  }

  query.user = user

  if (params.lt_id) {
    try {
      query._id = { $lt: new ObjectId(params.lt_id) }
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  if (params.read !== undefined) {
    query.readAt = { $exists: !!params.read }
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

  if (typeof params.type === 'string') {
    let types = params.type.split(',').map(type => type.trim())
    query.type = params.typeNin ? { $nin: types } : { $ni: types }
  }

  if (params.deleted && await canMessage.canBoolean('list', { deletedAt: true })) {
    query.deletedAt = { $exists: true }
  } else {
    query.deletedAt = { $exists: false }
  }

  let messages = await Message.find(query, undefined, { limit: options.limit + 1, sort: { _id: -1 } }).populate(User.refPopulate('creator')).exec()

  let more = messages.length > options.limit
  if (more) {
    messages.pop()
  }

  let now = new Date
  let results = []
  for (let i = 0; i < messages.length; i++) {
    let message = messages[i]
    let result = message.toJSON()
    if (!message.get('readAt') && tokenUser.equals(message.get('user'))) {
      message.set('readAt', now)
      await message.save()
    }

    message.setToken(token)

    result.cans = {
      delete: await message.canBoolean('delete'),
    }
    results.push(result)
  }

  ctx.vmState({ results, more })
}
