/* @flow */
import {Schema} from 'mongoose'

import model from './model'

import Token from './token'

import Role from './role'

// 授权信息
const schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
    required: true,
  },

  application: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
  },

  roles: [
    {
      role: {
        type: Schema.Types.ObjectId,
        ref: 'Role',
        required: true,
        index: true,
        validate: [
          {
            validator(role) {
              return this.get('roles').length <= 8
            },
            message: '用户角色不能大于 8 个',
          },
          {
            isAsync: true,
            async validator(id) {
              let role = await Role.findById(id).read('primary').exec()
              return role && role.get('application').equals(this.get('application'))
            },
            message: '用户角色不存在',
          },
        ],
      },
      reason: {
        type: String,
        maxlength: [255, '用户角色给予理由不能超过 255 字节'],
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
      expiredAt: {
        type: Date,
      },
    }
  ],

  createdAt: {
    type: Date,
    index: true,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    index: true,
    default: Date.now,
  },

  deletedAt: {
    type: Date,
    index: true,
  },
})

schema.index({user: 1, application: 1}, {unique: true})



schema.methods.canNotDelete = async function canNotDelete(token?: Token) {
  if (this.get('deletedAt')) {
    this.throw(404, 'Authorize does not exist')
  }
}

schema.methods.canList = async function canList(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'authorize/list'})

  let tokenUser = token.get('user')

  if (!tokenUser.equals(this.get('user')) || this.get('deletedAt')) {
    await token.canScope(token, {path: 'admin'})
    await tokenUser.canNotBlock(token)
    await tokenUser.canHasAdmin(token)
  }
}

schema.methods.canRead = async function canRead(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  let application = token.get('application')
  if (!application || !application.equals(this.get('application'))) {
    await token.canScope(token, {path: 'authorize/read'})
  }
  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }

  if (!tokenUser.get('admin')) {
    await this.canNotDelete()
  }

  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canNotBlock(token)
    await tokenUser.canHasAdmin(token)
  }
}


schema.methods.canSave = async function canSave(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  let application = token.get('application')
  if (!application || !application.equals(this.get('application'))) {
    await token.canScope(token, {path: 'authorize/save'})
  }

  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }

  if (!tokenUser.get('admin')) {
    await this.canNotDelete()
  }

  await tokenUser.canNotBlock(token)
  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canHasAdmin(token)
  }
}


schema.methods.canClear = async function canClear(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})

  await token.canScope(token, {path: 'authorize/clear'})

  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }
  await tokenUser.canNotBlock(token)

  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canHasAdmin(token)
  }
}


schema.methods.canDelete = async function canDelete(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})

  let application = token.get('application')
  if (!application || !application.equals(this.get('application'))) {
    await token.canScope(token, {path: 'authorize/delete'})
  }

  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }
  await tokenUser.canNotBlock(token)

  await this.canNotDelete(token)


  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canHasAdmin(token)
  }
}



schema.statics.findOneCreate = async function findOneCreate(user, application): Promise<Object> {
  //  创建 authorize
  let authorize = await this.findOne({
    user,
    application,
  }).exec()

  if (!authorize) {
    authorize = new this({
      user,
      application,
    })
  } else if (authorize.get('deletedAt')) {
    authorize.set('createdAt', new Date)
    authorize.set('deletedAt', undefined)
  }

  authorize.set('updatedAt', new Date)
  await authorize.save()
  return authorize
}



/**
 * 删除  删除相关的 token
 * @type {[type]}
 */
schema.pre('save', function (next) {
  if (this.isNew || !this.isModified('deletedAt') || !this.get('deletedAt')) {
    return next()
  }

  this.oncePost(async function () {
    await require('./token').default.updateMany({
      user: this,
      application: this.get('application'),
      deletedAt: {$exists: false}
    },
    {
      $set: {deletedAt: new Date}
    },
    {
      w: 0
    }).exec()
  })
  next()
})

export default model('Authorize', schema, {strict: false})
