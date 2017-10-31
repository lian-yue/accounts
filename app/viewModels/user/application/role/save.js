/* @flow */
import { Types } from 'mongoose'
import Role from 'models/role'
import Message from 'models/message'

const ObjectId = Types.ObjectId

import type { Context } from 'koa'
import type Token from 'models/token'
import type User from 'models/user'
import type Application from 'models/application'

export default async function (ctx: Context) {
  let token: Token = ctx.state.token
  let tokenUser: User = token.get('user')
  let role: Role = ctx.state.role
  let application: Application = ctx.state.applicationState

  let params = {
    ...ctx.request.query,
    ...(typeof ctx.request.body === 'object' ? ctx.request.body : {}),
  }

  if (!role) {
    role = new Role({
      application,
    })
  }
  await role.setToken(token).can('save')

  let oldName: string = role.get('name')

  if (typeof params.name === 'string') {
    role.set('name', params.name)
  }

  if (typeof params.content === 'string') {
    role.set('content', params.content)
  }

  if (params.level !== undefined && !isNaN(parseInt(params.level, 10))) {
    role.set('level', parseInt(params.level, 10))
  }

  if (params.children !== undefined) {
    let children = []
    if (typeof params.children === 'string') {
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
      let id
      let name: string
      if (typeof child === 'object') {
        id = child._id || child.id
        name = String(child.name || id)
      } else {
        id = child
        name = String(child)
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

      child = await Role.findById(id).exec()
      if (!child) {
        ctx.throw(403, 'notexist', { path: 'children', value: name })
        return
      }
      if (!child.get('application').equals(role.get('application'))) {
        ctx.throw(403, 'notexist', { path: 'children', value: child.get('name') })
      }

      let old = oldMaps[child.get('id')]

      if (child.get('deletedAt') && !old) {
        ctx.throw(403, 'notexist', { path: 'children', value: child.get('name') })
      }
      newChildren.push(child)
    }
    role.set('children', newChildren)
  }




  // rules 规则
  if (params.rules !== undefined) {
    let rules = []
    if (typeof params.rules === 'string') {
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
      if (!rule || typeof rule !== 'object' || typeof rule.scope !== 'string') {
        continue
      }

      newRules.push(rule)
    }
    role.set('rules', newRules)
  }


  await role.save()


  let message = new Message({
    user: application.get('creator'),
    contact: application.get('creator'),
    creator: tokenUser,
    roleId: role.get('_id'),
    name: oldName || role.get('name'),
    type: 'role_save',
    readAt: tokenUser.equals(application.get('creator')) ? new Date : undefined,
    token,
  })

  await message.save()

  ctx.vmState(role)
}
