export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var params = {
    ...ctx.request.query,
  }

  if (ctx.request.body && typeof ctx.request.body == 'object') {
    Object.assign(params, ctx.request.body)
  }

  var admin = ctx.method != 'delete' && params.admin

  await user.setToken(token).canThrow('admin')

  var attributes = user.get('attributes')
  var index = attributes.indexOf('admin')
  if (admin) {
    if (index == -1) {
      attributes.puah('admin')
      user.set('attributes', attributes)
    }
  } else if (index != -1) {
    attributes.splice(index, 1)
    user.set('attributes', attributes)
  }

  if (user.isModified()) {
    user.set('reason', params.reason)
    await user.save()
  }

  await ctx.render({})
}
