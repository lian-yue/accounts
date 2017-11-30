/* @flow */
import Auth from 'models/auth'
import Message from 'models/message'
import Verification from 'models/verification'


import type { Context } from 'koa'
import type Token from 'models/token'
import type User from 'models/user'
export default async function (ctx: Context) {
  let auth: Auth = ctx.state.auth
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let admin: boolean = !tokenUser.equals(auth.get('user'))

  let params = {
    ...ctx.request.query,
    ...(ctx.request.body && typeof ctx.request.body === 'object' ? ctx.request.body : {})
  }

  await auth.setToken(token).can('delete')

  const column: string = auth.get('column')


  if (admin) {
    // not verification
  } else if (column === 'phone' || column === 'email') {
    if (!params.code) {
      ctx.throw(403, 'required', { path: 'code' })
    }
    let verification = await Verification.findByCode({
      token,
      type: 'auth_delete',
      code: String(params.code),
      user: auth.get('user'),
      to: auth.get('value'),
      toType: column,
    })
    if (!verification) {
      ctx.throw(403, 'incorrect', { path: 'code' })
    }
  } else {
    if (!params.password) {
      ctx.throw(403, 'required', { path: 'password' })
    }
    if (!await tokenUser.comparePassword(params.password || '')) {
      ctx.throw(403, 'incorrect', { path: 'password' })
    }
  }

  auth.set('deletedAt', new Date)
  await auth.save()

  let message = new Message({
    user: auth.get('user'),
    contact: auth.get('user'),
    creator: tokenUser,
    application: token.get('application'),
    type: 'auth_delete',
    auth: auth.get('_id'),
    display: auth.get('display'),
    token,
  })
  await message.save()
  ctx.vmState(auth, 204)
}
