/* @flow */
import { Schema, Error as MongooseError } from 'mongoose'

import { hideIP } from './utils'


import locale from './locale/default'
import createError from './createError'

import model from './model'

import Meta from './meta'

const schema: Schema<MessageModel> = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
    required: true,
  },

  contact: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  application: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
  },

  type: {
    type: String,
    default: '',
    index: true,
    maxlength: 32,
  },

  message: {
    type: String,
    default: '',
    validate: [
      {
        validator(value) {
          if (value.length <= (1024 * 16)) {
            return true
          }
          this.invalidate('message', new MongooseError.ValidatorError({
            path: 'message',
            maxlength: '16KB',
            type: 'maxlength',
            message: locale.getLanguageValue(['errors', 'maxlength']),
          }))
        },
      },
    ]
  },

  userAgent: {
    type: String,
    set(value) {
      if (value) {
        return String(value).substr(0, 512)
      }
      return value
    },
    maxlength: 512,
  },

  token: {
    type: Schema.Types.ObjectId,
    ref: 'Token',
  },

  ip: {
    type: String,
    maxlength: 40,
  },

  readAt: {
    type: Date,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  deletedAt: {
    type: Date,
    index: true,
  },
})



schema.virtual('readOnly').get(function () {
  return ['', 'application'].indexOf(this.get('type')) === -1
})


/**
 * toSON
 * @type {Boolean}
 */
schema.set('toJSON', {
  virtuals: true,
  transform(doc: MessageModel, ret) {
    let token = doc.getToken()
    let user = token ? token.get('user') : undefined
    let me = user && user.equals(doc.get('creator'))
    let admin = user && user.get('admin') && !user.get('black')
    if (admin) {
      // 不处理
    } else if (me) {
      delete ret.token
      ret.ip = hideIP(ret.ip)
    } else {
      delete ret.ip
      delete ret.token
      delete ret.userAgent
    }
  },
})



schema.methods.canNotDelete = async function canNotDelete(token?: TokenModel) {
  if (this.get('deletedAt')) {
    throw createError(404, 'notexist', { path: 'message' })
  }
}


schema.methods.canList = async function canList(token?: TokenModel, { deletedAt = false }: { deletedAt: boolean } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user')) || this.get('deletedAt') || deletedAt
  let application: ?ApplicationModel = token.get('application')
  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'message/list', admin })
  }

  await token.canUser(token, { value: true, admin })
}


schema.methods.canClear = async function canClear(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user')) || this.get('deletedAt')
  let application: ?ApplicationModel = token.get('application')

  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'message/clear', admin })
  }

  await token.canUser(token, { value: true, black: true, admin })
}


schema.methods.canRead = async function canRead(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user'))
  let application: ?ApplicationModel = token.get('application')

  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'message/read', admin })
  }

  if (this.get('deletedAt') && (user.get('black') || !user.get('admin'))) {
    await this.canNotDelete(token)
  }

  admin = admin || this.get('deletedAt')

  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'message/read', admin })
  }

  await token.canUser(token, { value: true, admin })
}


schema.methods.canSave = async function canSave(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })


  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user'))
  let application: ?ApplicationModel = token.get('application')

  await token.canScope(token, { path: 'message/save', admin })

  if (Boolean(this.get('application')) !== Boolean(application)) {
    throw createError(400, 'incorrect', { path: 'application' })
  }

  if (application && !application.equals(this.get('application'))) {
    throw createError(400, 'incorrect', { path: 'application' })
  }

  await this.canNotDelete(token)

  await token.canUser(token, { value: true, black: true, admin })
}

schema.methods.canDelete = async function canDelete(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user'))
  let application: ?ApplicationModel = token.get('application')

  if (!application || !application.equals(this.get('application')) || admin) {
    await token.canScope(token, { path: 'message/delete', admin })
  }

  await this.canNotDelete(token)

  await token.canUser(token, { value: true, black: true, admin })
}



/**
 * 联系人方
 * @type {[type]}
 */
schema.pre('validate', function () {
  if (!this.get('contact')) {
    this.set('contact', this.get('creator') || this.get('user'))
  }
})

/**
 * toke 填补 application， ip 和 userAgent
 * @return {[type]} [description]
 */
schema.pre('save', function (next) {
  if (this.isNew && this.get('token')) {
    let token = this.get('token')
    if (!this.get('application') && token.get('application')) {
      this.set('application', token.get('application'))
    }
    if (!this.get('ip')) {
      this.set('ip', token.get('ip'))
    }
    if (!this.get('userAgent')) {
      this.set('userAgent', token.get('userAgent'))
    }
  }
  next()
})

/**
 * 发送给别人 自动给自己保留一个副本
 * @return {[type]} [description]
 */
schema.pre('save', function (next) {
  let user = this.get('user')
  let creator = this.get('creator')
  if (!this.isNew || this.get('user').equals(creator)) {
    return next()
  }

  let message: MessageModel = new this.constructor({
    ...this.toObject(),
    user: creator,
    contact: user,
    readAt: this.get('createdAt') || new Date,
  })
  this.savePost(message)
  next()
})



/**
 * 通知数
 * @return {[type]} [description]
 */
schema.pre('save', function (next) {
  let value = 0
  if (this.isNew && !this.get('readAt')) {
    value = 1
  } else if (this.isModified('readAt')) {
    value = this.get('readAt') ? -1 : 1
  } else if (!this.get('readAt') && this.isModified('deletedAt') && this.get('deletedAt')) {
    value = -1
  }
  if (value) {
    this.oncePost(async function () {
      let query: Object = {
        _id: this.get('user')
      }
      if (value === -1) {
        query.message = { $gte: 0 }
      }
      await Meta.findOneAndUpdate(query, { $inc: { message: value } })
    })
  }
  next()
})



export default (model('Message', schema, {
  strict: false,
  shardKey: {
    user: 1,
  },
}): Class<MessageModel>)
