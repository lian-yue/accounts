/* @flow */
import { Schema, Error as MongooseError } from 'mongoose'

import locale from './locale/default'

import createError from './createError'

import model from './model'

import Application from './application'


// 127 以下是普通用户
// 255 无限制管理员
const schema: Schema<RoleModel> = new Schema({
  level: {
    type: Schema.Types.Integer,
    default: 0,
    min: 0,
    max: 255,
  },

  name: {
    type: String,
    required: true,
    maxlength: 32,
  },

  application: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'Application',
    required: true,
  },

  // 内容
  content: {
    type: String,
    default: '',
    maxlength: 255,
  },

  children: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      validate: [
        {
          validator(id) {
            let value = this.get('children').length
            if (value <= 8) {
              return true
            }

            this.invalidate('children', new MongooseError.ValidatorError({
              path: 'children',
              maximum: 8,
              type: 'maximum',
              message: locale.getLanguagePackValue(['errors', 'maximum']),
              value,
            }))
          },
        },
        {
          isAsync: true,
          type: 'notexist',
          message: locale.getLanguagePackValue(['errors', 'notexist']),
          async validator(id) {
            if (!this.$isValid('children')) {
              return true
            }
            let role: RoleModel = await this.constructor.findById(id).read('primary').exec()
            return role && this.get('application').equals(role.get('application')) && !this.equals(role)
          },
        },
      ],
    },
  ],

  rules: [
    {
      scope: {
        type: String,
        maxlength: 64,
        required: true,
        validate: [
          {
            validator(scope) {
              let parent = this.parent()
              let value = parent.get('rules').length
              if (value <= 32) {
                return true
              }
              parent.invalidate('rules', new MongooseError.ValidatorError({
                path: 'rules',
                maximum: 32,
                type: 'maximum',
                message: locale.getLanguagePackValue(['errors', 'maximum']),
                value,
              }))
            },
          },
        ]
      },
      state: {
        type: Schema.Types.Integer,
        default: 0,
        min: -1,
        max: 1,
      },
    }
  ],

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    index: true,
  },
})



schema.methods.getApplication = async function getApplication() {
  let application = this.get('application')
  if (application && !application.get) {
    application = await Application.findById(application).exec()
  }
  if (!application) {
    throw createError(404, 'notexist', { path: 'application' })
  }
  return application
}

schema.methods.canList = async function canList(token?: TokenModel, { deletedAt = false }: { deletedAt: boolean } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  let admin: boolean = true
  let application: ApplicationModel = await this.getApplication()
  if (application.get('deletedAt')) {
    admin = true
  } else if (application.get('creator').equals(token.get('user'))) {
    admin = false
  } else if (application.get('status') === 'rejected' || application.get('status') === 'banned') {
    admin = true
  } else if (this.get('deletedAt') || deletedAt) {
    admin = true
  }

  if (!application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'role/list', admin })
  }

  if (this.get('deletedAt') || admin) {
    await token.canUser(token, { value: true, admin })
  }
}



schema.methods.canRead = async function canRead(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  let admin: boolean = true
  let application: ApplicationModel = await this.getApplication()
  if (application.get('deletedAt')) {
    admin = true
  } else if (application.get('creator').equals(token.get('user'))) {
    admin = false
  } else if (application.get('status') === 'rejected' || application.get('status') === 'banned') {
    admin = true
  } else if (this.get('deletedAt')) {
    admin = true
  }

  if (!application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'role/read', admin })
  }

  if (this.get('deletedAt') || admin) {
    await token.canUser(token, { value: true, admin })
  }
}


schema.methods.canSave = async function canSave(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')

  let application: ApplicationModel = await this.getApplication()

  await application.canNotDelete(token)

  let admin: boolean = !application.get('creator').equals(user) || application.get('status') === 'banned'

  if (!application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'role/save', admin })
  }

  await token.canUser(token, { value: true, black: true, admin })
}

schema.methods.canDelete = async function canDelete(token?: TokenModel, { value }: { value?: boolean } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')

  let application: ApplicationModel = await this.getApplication()
  await application.canNotDelete(token)

  let admin = !application.get('creator').equals(user) || application.get('status') === 'banned'

  await token.canScope(token, { path: 'role/delete', admin })
  await token.canUser(token, { value: true, black: true, admin })
  if (value === undefined) {
    // undefined
  } else if (value && this.get('deletedAt')) {
    throw createError(404, 'notexist', { path: 'role' })
  } else if (!value && !this.get('deletedAt')) {
    throw createError(400, 'hasexist', { path: 'role' })
  }
}




export default (model('Role', schema): Class<RoleModel>)
