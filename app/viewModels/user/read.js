/* @flow */
import User from 'models/user'

import type { Context } from 'koa'
import type Token from 'models/token'

export default async function (ctx: Context) {
  let user: User = ctx.state.user
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  await user.setToken(token).can('read')
  let me: boolean = tokenUser && tokenUser.equals(user)

  user.populate(User.metaPopulate(me))
  if (tokenUser.get('admin')) {
    user.populate(User.refPopulate('creator')).populate(User.refPopulate('updater')).populate({ path: 'application', select: { name: 1, slug: 1, content: 1 } })
  }
  await user.execPopulate()


  ctx.vmState({
    ...user.toJSON(),
    cans: {
      save: await user.canBoolean('save'),
      username: await user.canBoolean('save', { username: true }),
      password: await user.canBoolean('save', { password: true }),
      black: await user.canBoolean('black'),
      admin: await user.canBoolean('admin'),
    },
    authorize: me && token.get('authorize') ? token.get('authorize').toJSON() : undefined,
  })
}
