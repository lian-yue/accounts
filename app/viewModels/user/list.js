/* @flow */
import { Types } from 'mongoose'
import User from 'models/user'

import type { Context } from 'koa'
import type Token from 'models/token'

const ObjectId = Types.ObjectId

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  await tokenUser.setToken(token).can('list')

  let params = { ...ctx.request.query }

  let query = {}
  let options = {
    limit: 50,
  }


  if (params.limit && params.limit <= 200 && params.limit >= 1) {
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

  if (params.username) {
    query.username = String(params.username).trim()
  }

  if (params.admin) {
    query.admin = true
  }

  if (params.black) {
    query.black = true
  }

  let users = User.find(query, undefined, { limit: options.limit + 1, sort: { _id: -1 } }).populate(User.metaPopulate())
  if (tokenUser.get('admin')) {
    users.populate(User.refPopulate('creator'))
      .populate(User.refPopulate('updater'))
      .populate({
        path: 'application',
        select: {
          name: 1,
          slug: 1,
          content: 1,
        }
      })
  }

  users = await users.exec()

  let more = users.length > options.limit
  if (more) {
    users.pop()
  }

  let results: User[] = []
  for (let i = 0; i < users.length; i++) {
    let user: User = users[i]
    user.setToken(token)
    let result: Object = user.toJSON()
    result.cans = {
      save: await user.canBoolean('save'),
      black: await user.canBoolean('black'),
      admin: await user.canBoolean('admin'),
    }
    users.push(result)
  }
  ctx.vmState({ results, more })
}
