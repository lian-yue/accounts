/* @flow */
import {Schema} from 'mongoose'
import model from '../model'
import * as validator from '../validator'
import Token from '../token'
import * as oauths from './oauth'



const schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
    required: true,
  },
  column: {
    type: String,
    required: true,
    index: true,
  },
  value: {
    type: String,
    index: true,
    lowercase: true,
    trim: true,
    validate: [
      {
        validator(value) {
          if (this.get('column') !== 'email') {
            return true
          }
          return !!value
        },
        message: '电子邮箱不能为空',
      },
      {
        validator(value) {
          if (this.get('column') !== 'email') {
            return true
          }
          let email = validator.email(value)
          if (!email) {
            return false
          }
          this.set('value', email)
          return true
        },
        message: '电子邮箱格式不正确',
      },
      {
        isAsync: true,
        async validator(value) {
          if (this.get('column') !== 'email' || this.get('deletedAt')) {
            return true
          }
          let exists = await Auth.findOne({
            column: 'email',
            value,
            deletedAt: {$exists: false},
          }).read('primary').exec()
          return !exists || this.equals(exists)
        },
        message: '电子邮箱已存在 "{VALUE}"',
      },
      {
        isAsync: true,
        async validator(value) {
          if (this.get('column') !== 'email' || this.get('deletedAt') || !this.isNew) {
            return true
          }
          let results = await Auth.find({
            user: this.get('user'),
            column: this.get('column'),
            deletedAt: {$exists: false},
          }).exec()
          return results.length < 2
        },
        message: '最多只能绑定 2 个电子邮箱',
      },
      {
        validator(value) {
          if (this.get('column') !== 'phone') {
            return true
          }
          return !!value
        },
        message: '手机号不能为空',
      },
      {
        validator(value) {
          if (this.get('column') !== 'phone') {
            return true
          }
          let phone = validator.mobilePhone(value)
          if (!phone) {
            return false
          }
          this.set('value', phone)
          return true
        },
        message: '手机号格式不正确',
      },
      {
        isAsync: true,
        async validator(value) {
          if (this.get('column') !== 'phone' || this.get('deletedAt')) {
            return true
          }
          let exists = await Auth.findOne({
            column: 'phone',
            value,
            deletedAt: {$exists: false},
          }).read('primary').exec()
          return !exists || this.equals(exists)
        },
        message: '手机号已存在 "{VALUE}"',
      },
      {
        isAsync: true,
        async validator(value) {
          if (this.get('column') !== 'phone' || this.get('deletedAt') || !this.isNew) {
            return true
          }
          let results = await Auth.find({
            user: this.get('user'),
            column: this.get('column'),
            deletedAt: {$exists: false},
          }).exec()
          return results.length < 2
        },
        message: '最多只能绑定 2 个手机号',
      },
      {
        validator(value) {
          return !!value
        },
        message: '绑定信息不能为空',
      },
      {
        isAsync: true,
        async validator(value) {
          if (['phone', 'email'].indexOf(this.get('column')) !== -1 || this.get('deletedAt')) {
            return true
          }
          let exists = await Auth.findOne({
            column: this.get('column'),
            value,
            deletedAt: {$exists: false},
          }).read('primary').exec()
          return !exists || this.equals(exists)
        },
        message: '该账号已被绑定了',
      },
      {
        isAsync: true,
        async validator(value) {
          if (['phone', 'email'].indexOf(this.get('column')) !== -1 || this.get('deletedAt') || !this.isNew) {
            return true
          }
          let results = await Auth.find({
            user: this.get('user'),
            column: this.get('column'),
            deletedAt: {$exists: false},
          }).exec()
          return results.length < 2
        },
        message: '最多只能绑定 2 个该类型账号',
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

  nickname: {
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


schema.methods.canNotDelete = async function canNotDelete(token?: Token) {
  if (this.get('deletedAt')) {
    this.throw(404, 'Auth does not exist')
  }
}

schema.methods.canList = async function canList(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'auth/list'})
  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }

  if (!tokenUser.equals(this.get('user')) || this.get('deletedAt')) {
    await tokenUser.canNotBlock(token)
    await tokenUser.canHasAdmin(token)
  }
}


schema.methods.canRead = async function canRead(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'auth/read'})
  let tokenUser = token.get('user')
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
  await token.canScope(token, {path: 'auth/save'})
  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }
  await tokenUser.canNotBlock(token)
  await this.canNotDelete()

  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canHasAdmin(token)
  }
}

schema.methods.canDelete = async function canDelete(token?: Token, {verification}: {verification: boolean} = {verification: false}) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'auth/delete'})
  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('user'))) {
    await token.canScope(token, {path: 'admin'})
  }
  await tokenUser.canNotBlock(token)
  await this.canNotDelete()

  if (this.get('column') === 'username') {
    this.throw(403, 'Can not delete username')
  }

  if (!tokenUser.equals(this.get('user'))) {
    await tokenUser.canHasAdmin(token)
  }

  if (!verification) {
    // not verification
  } else if (tokenUser.equals(this.get('user'))) {
    this.throw(403, this.get('column') === 'phone' || this.get('column') === 'email' ? 'Requires verification code' : 'Need to verify the password')
  } else {
    await tokenUser.canHasAdmin(token)
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
  transform(doc, ret) {
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
  let column = this.get('column')
  if (column === 'username') {
    return
  }
  if (!this.isModified('deletedAt') && !this.isNew) {
    return
  }
  const User = require('../user').default
  let auth
  if (this.get('deletedAt')) {
    auth = await Auth.findOne({
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

  let auths = user.get('auths')
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
    this.savePost(user)
  }
})

schema.statics.oauths = oauths


const Auth = model('Auth', schema)

export default Auth
