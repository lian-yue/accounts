import {Schema, Types} from 'mongoose'

import model from './model'

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
              return this.get('roles').length <= 8;
            },
            message: '用户角色不能大于 8 个',
          },
          {
            async validator(id, cb) {
              var role = await Role.findById(id).read('primary').exec();
              cb(role && role.get('application').equals(this.get('application')));
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

schema.index({user:1, application: 1}, {unique: true})


schema.statics.findOneCreate = async function(user, application) {
  //  创建 authorize
  var authorize = await this.findOne({
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
    authorize.set('deletedAt', void 0)
  }

  authorize.set('updatedAt', new Date)
  await authorize.save()
  return authorize
}








/**
 * 删除  删除相关的 token
 * @type {[type]}
 */
schema.pre('save', async function() {
  if (this.isNew || !this.isModified('deletedAt') || !this.get('deletedAt')) {
    return
  }
  this.savePost(async () => {
    await require('./token').default.updateMany({user: this, application: this.get('application'), createdAt: {$lt: this.get('deletedAt')}, deletedAt: {$exists: false}}, {$set: {deletedAt: new Date}}, {w:0}).exec()
  })
})

export default model('Authorize', schema, {strict: false})
