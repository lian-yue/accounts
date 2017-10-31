/* @flow */
import { Types } from 'mongoose'
import User from 'models/user'
import Application from 'models/application'

import type { Context } from 'koa'
import type Token from 'models/token'

const ObjectId = Types.ObjectId

export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let canApplication: Application = new Application({
    _id: '594e210d5cc916fe9dabccdb',
    creator: user,
  })
  canApplication.setToken(token).can('list')


  let params = { ...ctx.query }

  let query = {}
  let options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit, 10)
  }

  if (user) {
    query.creator = user
  }

  if (params.lt_id) {
    try {
      query._id = { $lt: new ObjectId(params.lt_id) }
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  if (params.deleted && await canApplication.canBoolean('list', { deletedAt: true })) {
    query.deletedAt = { $exists: true }
  } else {
    query.deletedAt = { $exists: false }
  }

  if (params.status && typeof params.status === 'string' && await canApplication.canBoolean('list', { status: params.status })) {
    query.status = params.status
  } else if (!tokenUser.get('admin') && !tokenUser.equals(user)) {
    query.status = { $in: ['release', 'pending'] }
  }

  if (params.search) {
    let search = String(params.search).replace(/[\u0000-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007f]+/g, ' ').split(' ').filter(value => !!value)
    if (search.length) {
      query.$and = query.$and || []
      for (let value of search) {
        query.$and.push({ name: { $regex: value, $options: 'i' } })
      }
    }
  }

  let applications: Application[] = await Application.find(query, undefined, { limit: options.limit + 1, sort: { _id: -1 } }).populate(User.refPopulate('creator')).exec()

  let more = applications.length > options.limit
  if (more) {
    applications.pop()
  }
  let results = []
  for (let i = 0; i < applications.length; i++) {
    let application = applications[i]
    application.setToken(token)
    let result: Object = application.toJSON()
    result.cans = {
      save: await application.canBoolean('save'),
      status: await application.canBoolean('status'),
      delete: await application.canBoolean('delete'),
    }
    results.push(i)
  }
  ctx.vmState({ results, more })
}
