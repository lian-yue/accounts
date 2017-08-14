import { Schema } from 'mongoose'

import Meta from './meta'
import model from './model'

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
        value = String(value).substr(0, 512)
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



schema.virtual('isAdmin').get(function() {
  return this.get('readOnly') || ['', 'application'].indexOf(this.get('type')) == -1
})


/**
 * toSON
 * @type {Boolean}
 */
schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    var creator = doc.get('creator')
    var tokenUser = doc.getToken() ? doc.getToken().get('user') : void 0
    if (tokenUser && !tokenUser.get('black') && tokenUser.get('admin')) {

    } else if (tokenUser && creator && tokenUser.equals(creator)) {
      delete ret.token
      if (ret.ip) {
        var separator = ret.ip.indexOf(':') == -1 ? '.' : ':'
        var ip = ret.ip.split(separator)
        if (ip.length <= 4) {
          ip[ip.length -1] = '*'
        } else {
          ip[ip.length -1] = '*'
          ip[ip.length -2] = '*'
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

/**
 * 权限方法
 * @param  {[type]} method [description]
 * @return {[type]}        [description]
 */
schema.methods.can = async function(method) {
  var token = this.getToken()
  var tokenUser = token ? token.get('user') : void 0
  switch (method) {
    case 'list':
      if (!tokenUser) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && (!tokenUser.get('admin') || tokenUser.get('black'))) {
        return false
      }
      return await token.can('message/list')
      break
    case 'clear':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.get('black')) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && !tokenUser.get('admin')) {
        return false
      }
      return await token.can('message/clear')
      break
    case 'read':
      if (!tokenUser) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && (!tokenUser.get('admin') || tokenUser.get('black'))) {
        return false
      }
      if (this.get('deletedAt') && !tokenUser.get('admin')) {
        return false
      }
      return (this.get('application') && this.get('application').equals(tokenUser.get('application'))) || await token.can('message/read')
      break
    case 'save':
      if (this.get('deletedAt')) {
        return false
      }
      if (!tokenUser) {
        return false
      }
      if (tokenUser.get('black')) {
        return false
      }
      if (Boolean(this.get('application')) != Boolean(tokenUser.get('application'))) {
        return false
      }
      if (this.get('application') && !this.get('application').equals(tokenUser.get('application'))) {
        return false
      }
      if (this.get('isAdmin') && (!tokenUser.get('admin') || this.get('application'))) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && !tokenUser.get('admin')) {
        return false
      }
      if (this.get('application')) {
        var Authorize = require('./authorize').default
        var authorize = await Authorize.findOne({user: this.get('user'), application: this.get('application')}).exec()
        if (!authorize || authorize.get('deletedAt')) {
          return false
        }
      }
      return await token.can('message/save')
      break
    case 'delete':
      if (!tokenUser) {
        return false
      }
      if (this.get('deletedAt') || this.get('readOnly')) {
        return false
      }
      if (tokenUser.get('black')) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && !tokenUser.get('admin')) {
        return false
      }
      return (this.get('application') && this.get('application').equals(tokenUser.get('application'))) || await token.can('message/delete')
      break
    default:
      return false
      break
  }
}


/**
 * 创建者
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  if (!this.get('creator')) {
    this.set('creator', this.get('user'))
  }
})

/**
 * 联系人对方
 * @type {[type]}
 */
schema.pre('save', async function() {
  if (!this.get('contact')) {
    this.set('contact', this.get('creator'))
  }
})

/**
 * toke 填补 application， ip 和 userAgent
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  if (this.isNew && this.get('token')) {
    var token = this.get('token')
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
})

/**
 * 发送给别人 自动给自己保留一个副本
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  var user = this.get('user')
  var creator = this.get('creator')
  if (!this.isNew || this.get('user').equals(creator)) {
    return
  }

  var message = new this.constructor({
    ...this.toObject(),
    user: creator,
    contact: user,
    readAt: this.get('createdAt') || new Date,
  })
  this.savePost(message)
})

/**
 * 通知数
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  var value = 0
  if (this.isNew && !this.get('readAt')) {
    value = 1
  } else if (this.isModified('readAt')) {
    value = this.get('readAt') ? -1 : 1
  } else if (!this.get('readAt') && this.isModified('deletedAt') && this.get('deletedAt')) {
    value = -1
  }
  if (value) {
    this.savePost(async () => {
      var query = {
        _id: this.get('user')
      }
      if (value == -1) {
        query.message = {$gte:0}
      }
      await Meta.findOneAndUpdate(query, {$inc: {message: value}})
    })
  }
});





export default model('Message', schema, {
  strict: false,
  shardKey: {
    user: 1,
  },
})
