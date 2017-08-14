import User from 'models/user'
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  await user.setToken(token).canThrow('read')
  var me = tokenUser && tokenUser.equals(user)

  user.populate(User.metaPopulate(me))
  if (tokenUser.get('admin')) {
    user.populate(User.refPopulate('creator')).populate(User.refPopulate('updater')).populate({path: 'application', select: {name: 1, slug: 1, content: 1}})
  }
  await  user.execPopulate()


  ctx.vmState({
    ...user.toJSON(),
    cans: {
      save: await user.can('save'),
      username: await user.can('username'),
      password: await user.can('password'),
      black: await user.can('black'),
      restore: await user.can('restore'),
    },
    authorize: me && token.get('authorize') ? token.get('authorize').toJSON() : undefined,
  })
}
