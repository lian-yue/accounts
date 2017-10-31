/* @flow */
import { Types } from 'mongoose'
import Role from 'models/role'


import type { Context } from 'koa'
import type Token from 'models/token'
import type Authorize from 'models/authorize'

const ObjectId = Types.ObjectId

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let authorize: Authorize  = ctx.state.authorize
  await authorize.setToken(token).can('save')

  let params = {
    ...ctx.request.query,
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  delete params.cans
  delete params.user
  delete params.application
  delete params.createdAt
  delete params.updatedAt
  delete params.deletedAt

  for (let key in params) {
    let value = params[key]
    if (!key || key === 'roles' || /^[a-z][0-9a-zA-Z]*$/.test(key) || typeof value === 'object') {
      continue
    }
    authorize.set(key, value === null || value === undefined ? undefined : value)
  }

  if (params.roles !== undefined && params.roles !== null) {
    let roles = []
    if (typeof params.roles === 'string') {
      try {
        roles = JSON.parse(params.roles)
      } catch (e) {
        e.status = 403
        throw e
      }
    } else if (params.roles instanceof Array) {
      roles = params.roles
    }
    if (!Array.isArray(roles)) {
      ctx.throw(403, 'match', { path: 'roles' })
      return
    }

    if (roles.length > 32) {
      ctx.throw(403, 'maximum', { path: 'roles', maximum: 8 })
      return
    }

    let oldMaps = {}
    for (let i = 0; i < authorize.get('roles').length; i++) {
      let role = authorize.get('roles')[i]
      oldMaps[role.role] = role
    }

    let newRoles = []
    for (let i = 0; i < roles.length; i++) {
      let role: Object = roles[i]
      if (!role || typeof role !== 'object' || !role.role) {
        continue
      }
      let id: string | ObjectId
      let name: string
      if (typeof role.role === 'object') {
        id = String(role.role._id || role.role.id)
        name = role.role.name || id
      } else {
        id = String(role.role)
        name = id
      }
      if (!id) {
        continue
      }
      try {
        id = new ObjectId(id)
      } catch (e) {
        e.status = 403
        throw e
      }
      role.role = await Role.findById(id).exec()
      if (!role.role) {
        ctx.throw(403, 'notexist', { path: 'role', value: name })
        return
      }
      if (!role.role.get('application').equals(authorize.get('application'))) {
        ctx.throw(403, 'notexist', { path: 'role', value: role.role.get('name') })
        return
      }

      let old = oldMaps[role.role.get('id')]
      if (role.role.get('deletedAt') && !old) {
        ctx.throw(403, 'notexist', { path: 'role', value: role.role.get('name') })
        return
      }

      delete role.id
      delete role.createdAt
      if (role.expiredAt) {
        role.expiredAt = new Date(role.expiredAt)
        if (isNaN(role.expiredAt)) {
          role.expiredAt = new Date
        }
      } else if (role.expiredAt !== undefined) {
        role.expiredAt = undefined
      }
      if (old) {
        role = { ...old, ...role }
      }
      newRoles.push(role)
    }
    authorize.set('roles', newRoles)
  }
  await authorize.save()

  ctx.vmState(authorize.toJSON())
}
