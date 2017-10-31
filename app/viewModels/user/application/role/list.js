/* @flow */
import { Types } from 'mongoose'
import Role from 'models/role'

const ObjectId = Types.ObjectId


import type { Context } from 'koa'
import type Token from 'models/token'
import type Application from 'models/application'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let application: Application = ctx.state.applicationState
  await (new Role({
    _id: '594e210d5cc916fe9dabccdb',
    application,
  })).setToken(token).can('list')


  let params = { ...ctx.query }

  let query = {}
  let options = {
    limit: 50,
  }

  if (params.limit && params.limit <= 100 && params.limit >= 1) {
    options.limit = parseInt(params.limit, 10)
  }

  if (params.lt_id) {
    try {
      query._id = { $lt: new ObjectId(params.lt_id) }
    } catch (e) {
      e.status = 403
      throw e
    }
  }

  query.deletedAt = { $exists: !!params.deleted }

  if (params.search) {
    let search = String(params.search).replace(/[\u0000-\u002f\u003a-\u0040\u005b-\u0060\u007b-\u007f]+/g, ' ').split(' ').filter(value => !!value)
    if (search.length) {
      query.$and = query.$and || []
      for (let value of search) {
        query.$and.push({ name: { $regex: value, $options: 'i' } })
      }
    }
  }

  let roles = await Role.find(query, undefined, { limit: options.limit + 1, sort: { _id: -1 } }).exec()

  let more = roles.length > options.limit
  if (more) {
    roles.pop()
  }
  let results = []
  for (let i = 0; i < roles.length; i++) {
    let role = roles[i]
    role.setToken(token)
    let result = role.toJSON()
    result.cans = {
      save: await role.canBoolean('save'),
      delete: await role.canBoolean('delete'),
    }
    results.push(result)
  }

  ctx.vmState({ results, more })
}
