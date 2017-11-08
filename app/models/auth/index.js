/* @flow */
import { Schema, Error as MongooseError } from 'mongoose'

import oauthConfig from 'config/oauth'

import  { matchEmail, matchMobilePhone } from '../utils'

import locale from '../locale/default'

import createError from '../createError'

import model from '../model'

import * as oauths from './oauth'


const schema: Schema<AuthModel> = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
    required: true,
  },
  column: {
    type: String,
    index: true,
    required: true,
  },
  value: {
    type: String,
    index: true,
    lowercase: true,
    trim: true,
    validate: [
      {
        validator(value) {
          if (!this.$isValid(this.get('column'))) {
            return true
          }
          if (value) {
            return true
          }
          this.invalidate(this.get('column'), locale.getLanguageValue(['errors', 'required']), value, 'required')
        },
      },
      {
        validator(value) {
          if (!this.$isValid(this.get('column'))) {
            return true
          }
          switch (this.get('column')) {
            case 'email': {
              let email = matchEmail(value)
              if (email) {
                this.set('value', email)
                return true
              }
              break
            }
            case 'phone': {
              let phone = matchMobilePhone(value)
              if (phone) {
                this.set('value', phone)
                return true
              }
              break
            }
            default:
              return true
          }
          this.invalidate(this.get('column'), locale.getLanguageValue(['errors', 'match']), value, 'match')
        },
      },
      {
        isAsync: true,
        async validator(value) {
          if (!this.$isValid(this.get('column'))) {
            return true
          }
          if (this.get('deletedAt')) {
            return true
          }

          let exists: ?AuthModel = await this.constructor.findOne({
            column: this.get('column'),
            value,
            deletedAt: { $exists: false },
          }).read('primary').exec()

          if (!exists || this.equals(exists)) {
            return true
          }

          this.invalidate(this.get('column'), locale.getLanguageValue(['errors', 'hasexist']), value, 'hasexist')
        },
      },
      {
        isAsync: true,
        async validator(value) {
          if (!this.$isValid(this.get('column'))) {
            return true
          }
          if (this.get('deletedAt') || !this.isNew) {
            return true
          }
          let results: AuthModel[] = await this.constructor.find({
            user: this.get('user'),
            column: this.get('column'),
            deletedAt: { $exists: false },
          }).exec()
          if (results.length <= 3) {
            return true
          }
          this.invalidate(this.get('column'), new MongooseError.ValidatorError({
            path: this.get('column'),
            maximum: 3,
            type: 'maximum',
            message: locale.getLanguageValue(['errors', 'maximum']),
            value: results.length,
          }))
        },
      },
    ],
  },

  token: {
    type: Object,
    default: Object,
  },

  state: {
    type: Object,
    default: Object,
  },

  settings: {
    type: Object,
    default: Object,
  },
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


schema.methods.canNotDelete = async function canNotDelete(token?: TokenModel) {
  if (this.get('deletedAt')) {
    throw createError(404, 'notexist', { path: 'auth' })
  }
}

schema.methods.canList = async function canList(token?: TokenModel, { deletedAt = false }: { deletedAt: boolean } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })
  let user: UserModel = token.get('user')
  let admin: boolean = this.get('deletedAt') || deletedAt || !user.equals(this.get('user'))
  await token.canScope(token, { path: 'auth/list', admin })
  await token.canUser(token, { value: true, admin })
}


schema.methods.canRead = async function canRead(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })
  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user'))

  await token.canScope(token, { path: 'auth/read', admin })

  if (this.get('deletedAt') && (user.get('black') || !user.get('admin'))) {
    await this.canNotDelete(token)
  }

  admin = admin || this.get('deletedAt')

  await token.canScope(token, { path: 'auth/read', admin })
  await token.canUser(token, { value: true, admin })
}


schema.methods.canSave = async function canSave(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })
  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user'))

  await token.canScope(token, { path: 'auth/save', admin })

  await this.canNotDelete(token)

  await token.canUser(token, { value: true, black: true, admin })

  let column: string = this.get('column')
  if (column === 'username') {
    throw createError(403, 'match', { path: 'column' })
  } else if (column === undefined || column === 'email' || column === 'phone' || oauthConfig[column] || !this.isNew) {
    // true
  } else {
    throw createError(403, 'match', { path: 'column' })
  }
}

schema.methods.canDelete = async function canDelete(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user'))

  await token.canScope(token, { path: 'auth/delete', admin })

  await this.canNotDelete(token)

  await token.canUser(token, { value: true, black: true, admin })

  let column: string = this.get('column')

  if (column === 'username') {
    throw createError(403, 'match', { path: 'column' })
  } else if (column === 'email' || column === 'phone') {
    if (!admin && !await this.constructor.findOne({ user: this.get('user'), _id: { $ne: this.get('_id') }, column, deletedAt: { $exists: false } }).exec()) {
      throw createError(403, 'minimum', { minimum: 1, path: column })
    }
  } else if (oauthConfig[column]) {
    if (!admin && !user.get('password')) {
      throw createError(403, 'permission')
    }
  } else {
    throw createError(403, 'match', { path: 'column' })
  }
}

/**
 * 显示名称
 * @return {[type]} [description]
 */
schema.virtual('display').get(function () {
  let state = this.get('state')
  if (state.nickname) {
    return state.nickname
  }
  if (state.username) {
    return state.username
  }
  if (state.email) {
    return emailDisplay(state.email)
  }

  let value = this.get('value')
  switch (this.get('column')) {
    case 'email':
      value = emailDisplay(value)
      break
    case 'phone':
      value = value.substr(0, 5) + '***' + value.substr(-3, 3)
      break
    default:
      value = value.substr(0, parseInt(value.length / 3.5, 10)) + '***' + value.substr(0 - parseInt(value.length / 3.5, 10))
  }
  return value
})


function emailDisplay(value) {
  let email = value.split('@')
  if (email[0].length <= 3) {
    email[0] = '***'
  } else if (email[0].length <= 6) {
    email[0] = '***' + email[0].substr(-2, 2)
  } else if (email[0].length <= 8) {
    email[0] = email[0].substr(0, 2) + '***' + email[0].substr(-2, 2)
  } else {
    email[0] = email[0].substr(0, 3) + '***' + email[0].substr(-3, 3)
  }
  if (email[1] && email[1].length > 7) {
    email[1] = '***' + email[1].substr(parseInt(email[1].length / 2, 10))
  }
  return email.join('@')
}


/**
 * 删除敏感信息
 * @type {Boolean}
 */
schema.set('toJSON', {
  virtuals: true,
  transform(doc: AuthModel, ret) {
    delete ret.value
    delete ret.token
    delete ret.state
  },
})


/**
 * 自动添加更新时间
 * @return {[type]} [description]
 */
schema.pre('save', function (next) {
  if (!this.isNew) {
    this.set('updatedAt', new Date)
  }
  next()
})

/**
 * 自动更新用户的属性
 * @return {[type]} [description]
 */
schema.pre('save', async function () {
  let column: string = this.get('column')
  if (column === 'username') {
    return
  }
  if (!this.isModified('deletedAt') && !this.isNew) {
    return
  }
  const User = require('../user').default
  let auth: AuthModel
  if (this.get('deletedAt')) {
    auth = await this.constructor.findOne({
      user: this.get('user'),
      column,
      _id: {
        $ne: this.get('_id'),
      },
      deletedAt: {
        $exists: false
      }
    }).read('primary').exec()
  } else {
    auth = this
  }

  let user = await User.findById(this.get('user')).read('primary').exec()
  if (!user) {
    return
  }

  let auths: string[] = user.get('auths')
  let index = auths.indexOf(column)
  if (auth) {
    if (index === -1) {
      auths.push(column)
      user.set('auths', auths)
    }
  } else if (index !== -1) {
    auths.splice(index, 1)
    user.set('auths', auths)
  }

  if (user.isModified('auths')) {
    this.oncePost(user)
  }
})

for (let key in oauths) {
  schema.statics[key] = oauths[key]
}

export default (model('Auth', schema): Class<AuthModel>)
