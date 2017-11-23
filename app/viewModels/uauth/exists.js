/* @flow */
import Auth from 'models/auth'

import type { Context } from 'koa'
export default async function (ctx: Context) {
  if (Object.keys(ctx.query).length > 10) {
    ctx.throw(403, 'minimum', { path: 'query' })
  }

  let result: {[string]: boolean} = {}

  for (let column in ctx.query) {
    let value = ctx.query[column].toLowerCase().trim()
    if (!column || column.charAt(0) === '_' || column.charAt(0) === '-' || column === 'format' || column.indexOf('token') !== -1 || !value) {
      continue
    }

    let query = {
      column,
      value,
      deletedAt: { $exists: false },
    }

    if (column === 'username') {
      delete query.deletedAt
    }

    result[column] = Boolean(await Auth.findOne(query).exec())
  }
  ctx.vmState(result)
}
