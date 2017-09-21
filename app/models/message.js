/* @flow */
import {Schema} from 'mongoose'

import model from './model'
import Meta from './meta'
import Token from './token'

const schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
    required: true,
  },

  contact: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  application: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
  },

  readOnly: {
    type: Boolean,
    default: false,
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
    maxlength: [1024 * 16, '消息不能大于 16KB'],
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



schema.virtual('isAdmin').get(function () {
  if (this.get('readOnly')) {
    return true
  }
  if (['', 'application'].indexOf(this.get('type')) === -1) {
    return true
  }
  return false
})


/**
 * toSON
 * @type {Boolean}
 */
schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    let creator = doc.get('creator')
    let tokenUser = doc.getToken() ? doc.getToken().get('user') : undefined
    if (tokenUser && !tokenUser.get('black') && tokenUser.get('admin')) {
      // 不处理
    } else if (tokenUser && creator && tokenUser.equals(creator)) {
      delete ret.token
      if (ret.ip) {
        let separator = ret.ip.indexOf(':') === -1 ? '.' : ':'
        let ip = ret.ip.split(separator)
        if (ip.length <= 4) {
          ip[ip.length - 1] = '*'
        } else {
          ip[ip.length - 1] = '*'
          ip[ip.length - 2] = '*'
        }
        ret.ip = ip.join(separator)
      }
    } else {
      delete ret.ip
      delete ret.token
      delete ret.userAgent
    }
  },
})



schema.methods.canNotDelete = async function canNotDelete(token?: Token) {
  if (this.get('deletedAt')) {
    this.throw(404, 'Message does not exist')
  }
}

/**
 * 权限方法
 * @param  {[type]} method [description]
 * @return {[type]}        [description]
 */
schema.methods.canList = async function canList(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})

  let tokenUser = token.get('user')
  if (!tokenUser.get('application') || !tokenUser.get('application').equals(this.get('application'))) {
    await token.canScope(token, {path: 'message/list'})
  }
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }

  if (!tokenUser.equals(this.get('user')) || this.get('deletedAt')) {
    await tokenUser.canNotBlock(token)
    await tokenUser.canHasAdmin(token)
  }
}

schema.methods.canClear = async function canClear(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})

  let tokenUser = token.get('user')
  if (!tokenUser.get('application') || !tokenUser.get('application').equals(this.get('application'))) {
    await token.canScope(token, {path: 'message/clear'})
  }

  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }

  await tokenUser.canNotBlock(token)

  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canHasAdmin(token)
  }
}

schema.methods.canRead = async function canRead(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }

  await token.canUser(token, {value: true})

  let tokenUser = token.get('user')
  if (!tokenUser.get('application') || !tokenUser.get('application').equals(this.get('application'))) {
    await token.canScope(token, {path: 'message/read'})
  }

  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }

  if (this.get('deletedAt') && !tokenUser.get('admin')) {
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
  await token.canScope(token, {path: 'message/save'})
  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }

  if (Boolean(this.get('application')) !== Boolean(tokenUser.get('application'))) {
    this.throw(400, 'The `application` parameter is incorrect')
  }

  if (this.get('application') && !this.get('application').equals(tokenUser.get('application'))) {
    this.throw(400, 'The `application` parameter is incorrect')
  }
  await tokenUser.canNotBlock(token)

  await this.canNotDelete()

  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canHasAdmin(token)
  }
}

schema.methods.canDelete = async function canDelete(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  let tokenUser = token.get('user')
  if (!tokenUser.get('application') || !tokenUser.get('application').equals(this.get('application'))) {
    await token.canScope(token, {path: 'message/delete'})
  }
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }
  await tokenUser.canNotBlock(token)
  await this.canNotDelete()

  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canHasAdmin(token)
  }
}




/**
 * 创建者
 * @return {[type]} [description]
 */
schema.pre('save', function (next) {
  if (!this.get('creator')) {
    this.set('creator', this.get('user'))
  }
  next()
})

/**
 * 联系人对方
 * @type {[type]}
 */
schema.pre('save', function (next) {
  if (!this.get('contact')) {
    this.set('contact', this.get('creator'))
  }
  next()
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

  let message = new this.constructor({
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
    this.savePost(async () => {
      let query: Object = {
        _id: this.get('user')
      }
      if (value === -1) {
        query.message = {$gte: 0}
      }
      await Meta.findOneAndUpdate(query, {$inc: {message: value}})
    })
  }
  next()
})



export default model('Message', schema, {
  strict: false,
  shardKey: {
    user: 1,
  },
})
