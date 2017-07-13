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

  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  application: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
  },

  readAt: {
    type: Date,
    index: true,
  },

  message: {
    type: String,
    required: [true, '通知信息不能为空'],
    maxlength: [1024, '通知信息不能大于 1KB'],
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
/**
 * toSON
 * @type {Boolean}
 */
schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.user
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
      if (!tokenUser.equals(this.get('user')) && (!tokenUser.canAttribute('admin') || tokenUser.canAttribute('black'))) {
        return false
      }
      return await token.can('notification/list')
      break
    case 'clear':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.canAttribute('black')) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && !tokenUser.canAttribute('admin')) {
        return false
      }
      return await token.can('notification/clear')
      break
    case 'read':
      if (!tokenUser) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && (!tokenUser.canAttribute('admin') || tokenUser.canAttribute('black'))) {
        return false
      }
      if (this.get('deletedAt') && !tokenUser.canAttribute('admin')) {
        return false
      }
      return (this.get('application') && this.get('application').equals(tokenUser.get('application'))) || await token.can('notification/read')
      break
    case 'save':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.canAttribute('black')) {
        return false
      }
      if (Boolean(this.get('application')) != Boolean(tokenUser.get('application'))) {
        return false
      }
      if (this.get('application') && !this.get('application').equals(tokenUser.get('application'))) {
        return false
      }
      if (!this.get('application') && !tokenUser.canAttribute('admin')) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && !tokenUser.canAttribute('admin')) {
        return false
      }
      if (this.get('application')) {
        var Authorize = require('./authorize').default
        var authorize = await Authorize.findOne({user: this.get('user'), application: this.get('application')}).exec()
        if (!authorize || authorize.get('deletedAt')) {
          return false
        }
      }
      return await token.can('notification/save')
      break
    case 'delete':
      if (!tokenUser) {
        return false
      }
      if (this.get('deletedAt')) {
        return false
      }
      if (tokenUser.canAttribute('black')) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && !tokenUser.canAttribute('admin')) {
        return false
      }
      return (this.get('application') && this.get('application').equals(tokenUser.get('application'))) || await token.can('notification/delete')
      break
    default:
      return false
      break
  }
}

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
        _id:this.get('user')
      }
      if (value == -1) {
        query.notification = {$gte:0}
      }
      await Meta.findOneAndUpdate(query, {$inc: {notification: value}})
    })
  }
});


export default model('Notification', schema, {strict: false})
