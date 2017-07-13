import Auth from 'models/auth'

export default async function(ctx) {
  if (Object.keys(ctx.query).length > 10) {
    ctx.throw('查询字段数过多', 403)
  }

  var result = {}

  for (var column in ctx.query) {
    var value =  ctx.query[column].toLowerCase().trim()
    if (!column || column.substr(0, 1) == '_' || column.substr(0, 1) == '-' || column.indexOf('token') != -1 || !value) {
      continue;
    }

    var query = {
      column,
      value,
      deletedAt: {$exists: false},
    }

    if (column == 'username') {
      delete query.deletedAt
    }

    result[column] = !!(await Auth.findOne(query).exec())
  }
  ctx.vmState(result);
}
