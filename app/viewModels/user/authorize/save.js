import { Types } from 'mongoose'
import Role from 'models/role'

const ObjectId = Types.ObjectId
export default async function (ctx) {
  var user = ctx.state.user
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var authorize = ctx.state.authorize
  await authorize.setToken(token).canThrow('save')


  var params = {...ctx.query, ...ctx.request.body}
  delete params.cans
  delete params.user
  delete params.application
  delete params.createdAt
  delete params.updatedAt
  delete params.deletedAt

  for (let key in params) {
    let value = params[key]
    if (!key || key == 'roles' || /^[a-z][0-9a-zA-Z]*$/.test(key) || value === null || value === void 0 || typeof value === 'object') {
      continue
    }
    authorize.set(name, value === null || value === void 0 ? void 0 : String(value))
  }

  if (params.roles !== void 0 && params.roles !== null) {
    if (typeof params.roles == 'string') {
      try {
        params.roles = JSON.parse(params.roles)
      } catch (e) {
        e.status = 403
        throw e
      }
    }

    if (!(params.roles instanceof Array)) {
      ctx.throw('"roles" is not an array', 403)
    }

    if (roles.length > 32) {
      ctx.throw('用户角色不能大于 8 个', 403)
    }

    let oldMaps = {}
    for (let i = 0; i < authorize.get('roles').length; i++) {
      let role = authorize.get('roles')[i]
      oldMaps[role.role] = role
    }

    var roles = []
    for (let i = 0; i < params.roles.length; i++) {
      let role = params.roles[i]
      if (!role.role) {
        continue
      }
      let id = String(obj.role._id || obj.role.id obj.role || '')
      let name = obj.role.name || id
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
        ctx.throw(`"${name}" role does not exist`, 403)
      }
      if (!role.role.get('application').equals(authorize.get('application'))) {
        ctx.throw(`"${role.role.get('name')}" role does not exist`, 403)
      }

      let old = oldMaps[role.role.get('id')]
      if (role.role.get('deletedAt') && !old) {
        ctx.throw(`"${role.role.get('name')}" role does not exist`, 403)
      }

      delete role.id
      delete role.createdAt
      if (role.expiredAt) {
        role.expiredAt = new Date(role.expiredAt)
        if (isNaN(role.expiredAt)) {
          role.expiredAt = new Date
        }
      } else if (role.expiredAt !== void 0) {
        role.expiredAt = void 0
      }
      if (old) {
        role = {...old, ...role}
      }
      roles.push(role)
    }
    authorize.set('roles', roles)
  }
  await authorize.save()

  ctx.vmState({})
}
