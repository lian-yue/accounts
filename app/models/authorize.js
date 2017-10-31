/* @flow */
import { Schema, Error as MongooseError, type MongoId } from 'mongoose'

import locale from './locale/default'

import createError from './createError'

import model from './model'

import Role from './role'


// 授权信息
const schema: Schema<AuthorizeModel> = new Schema({
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
              let parent = this.parent()
              let value = parent.get('roles').length
              if (value <= 8) {
                return true
              }
              parent.invalidate('roles', new MongooseError.ValidatorError({
                path: 'roles',
                maximum: 8,
                type: 'maximum',
                message: locale.getLanguagePackValue(['errors', 'maximum']),
                value,
              }))
            },
          },
          {
            isAsync: true,
            async validator(id) {
              let parent = this.parent()
              if (!parent.$isValid('roles')) {
                return true
              }
              let role = await Role.findById(id).read('primary').exec()
              return role && role.get('application').equals(parent.get('application'))
            },
            message: locale.getLanguagePackValue(['errors', 'notexist']),
          },
        ],
      },
      reason: {
        type: String,
        maxlength: 255,
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

schema.index({ user: 1, application: 1 }, { unique: true })



schema.methods.canNotDelete = async function canNotDelete(token?: TokenModel) {
  if (!this.get('deletedAt')) {
    return
  }
  throw createError(404, 'notexist', { path: 'authorize' })
}

schema.methods.canList = async function canList(token?: TokenModel, { deletedAt = false }: {deletedAt: boolean} = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = this.get('user')

  let admin: boolean = !user.equals(this.get('user')) || this.get('deletedAt') || deletedAt

  await token.canScope(token, { path: 'authorize/list', admin })
  await token.canUser(token, { value: true, admin })
}


schema.methods.canRead = async function canRead(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  await token.canUser(token, { value: true })

  let user: UserModel = this.get('user')


  let admin: boolean = !user.equals(this.get('user'))
  let application: ApplicationModel = token.get('application')

  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'authorize/read', admin })
  }

  if (this.get('deletedAt') && (user.get('black') || !user.get('admin'))) {
    await this.canNotDelete(token)
  }

  admin = admin || this.get('deletedAt')

  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'authorize/read', admin })
  }
  await token.canUser(token, { value: true, admin })
}


schema.methods.canSave = async function canSave(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = this.get('user')

  let admin: boolean = !user.equals(this.get('user'))
  let application: ApplicationModel = token.get('application')

  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'authorize/save', admin })
  }

  await this.canNotDelete(token)

  await token.canUser(token, { value: true, black: true, admin })
}


schema.methods.canClear = async function canClear(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user'))

  await token.canScope(token, { path: 'authorize/clear', admin })
  await token.canUser(token, { value: true, black: true, admin })
}


schema.methods.canDelete = async function canDelete(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user'))
  let application: ApplicationModel = token.get('application')

  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'authorize/delete', admin })
  }

  await this.canNotDelete(token)

  await token.canUser(token, { value: true, black: true, admin })
}



schema.statics.findOneCreate = async function findOneCreate(user: MongoId | UserModel, application: MongoId | ApplicationModel): Promise<AuthorizeModel> {
  //  创建 authorize
  let authorize: ?AuthorizeModel = await this.findOne({
    user,
    application,
  }).exec()

  let now = new Date

  if (!authorize) {
    authorize = new this({
      user,
      application,
    })
  } else if (authorize.get('deletedAt')) {
    authorize.set('createdAt', now)
    authorize.set('deletedAt', undefined)
  }

  authorize.set('updatedAt', now)
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
      deletedAt: { $exists: false }
    },
    {
      $set: { deletedAt: new Date }
    },
    {
      w: 0
    }).exec()
  })
  next()
})

export default (model('Authorize', schema, { strict: false }): Class<AuthorizeModel>)
