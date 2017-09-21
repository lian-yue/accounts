import { Types } from 'mongoose'
import Role from 'models/role'
import Message from 'models/message'

const ObjectId = Types.ObjectId

export default async function (ctx) {
  var token = ctx.state.token
  var tokenUser = token.get('user')
  var role = ctx.state.role
  var application = ctx.state.applicationState

  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  if (!role) {
    role = new Role({
      application,
    })
  }
  await role.setToken(token).canThrow('save')

  var oldName = role.get('name')

  if (typeof params.name == 'string') {
    role.set('name', params.name)
  }

  if (typeof params.content == 'string') {
    role.set('content', params.content)
  }

  if (params.level !== void 0 && !isNaN(parseInt(params.level))) {
    role.set('level', parseInt(params.level))
  }

  if (params.children !== void 0) {
    var children = []
    if (typeof params.children == 'string') {
      children = params.children.split(',')
    } else if (params.children instanceof Array) {
      children = params.children
    }

    let oldMaps = {}
    for (let i = 0; i < role.get('children').length; i++) {
      let child = role.get('children')[i]
      oldMaps[child] = child
    }

    let newChildren = []
    for (let i = 0; i < children.length; i++) {
      let child = children[i]
      if (!child) {
        continue
      }
      let id = String(child._id || child.id || child || '')
      let name = child.name || id
      if (!id) {
        continue
      }
      try {
        id = new ObjectId(id)
      } catch (e) {
        e.status = 403
        throw e
      }

      child = await Role.findById(id).exec()
      if (!child) {
        ctx.throw(`"${name}" child role does not exist`, 403)
      }
      if (!child.get('application').equals(role.get('application'))) {
        ctx.throw(`"${child.get('name')}" child role does not exist`, 403)
      }

      let old = oldMaps[child.get('id')]

      if (child.get('deletedAt') && !old) {
        ctx.throw(`"${child.get('name')}" child role does not exist`, 403)
      }
      newChildren.push(child)
    }
    role.set('children', newChildren)
  }




  // rules 规则
  if (params.rules !== void 0) {
    var rules = []
    if (typeof params.rules == 'string') {
      try {
        rules = JSON.parse(params.rules)
      } catch (e) {
        e.status = 403
        throw e
      }
    } else if (params.rules instanceof Array) {
      rules = params.rules
    }

    let newRules = []
    for (let i = 0; i < rules.length; i++) {
      let rule = rules[i]
      if (!rule || typeof rule != 'object' || typeof rule.scope != 'string') {
        continue
      }

      newRules.push(rule)
    }
    role.set('rules', newRules)
  }


  await role.save()


  var message = new Message({
    user: application.get('creator'),
    creator: tokenUser,
    roleId: role.get('_id'),
    name: oldName || role.get('name'),
    type: 'role_save',
    readOnly: true,
    readAt: tokenUser.equals(application.get('creator')) ? new Date : void 0,
    token,
  })

  await message.save()

  ctx.vmState(role)
}
