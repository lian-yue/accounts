/* @flow */
import {Schema, Types} from 'mongoose'
import bcrypt            from 'bcrypt'

import reserve          from 'config/reserve'
import locale           from 'config/locale'

import model            from './model'
import * as validator   from './validator'


import Auth     from './auth'
import Meta     from './meta'
import Token     from './token'
// import Message  from './message'


const schema = new Schema({
  username: {
    type: String,
    unique: true,
    trim: true,
    required: [true, '请输入用户名'],
    minlength: [3, '用户名长度不能少于 3 位或大于 16 字节 ({PATH})'],
    maxlength: [16, '用户名长度不能少于 3 位或大于 16 字节 ({PATH})'],
    match: [/^[0-9a-z-]+$/i, '用户名只允许使用英文，数字和 - 符号 ({PATH})'],
    validate: [
      {
        validator(username) {
          return !validator.mobilePhone(username)
        },
        message: '用户名不能为电话号 ({PATH})',
      },
      {
        validator(username) {
          return !/^[-]|[-]$/.test(username)
        },
        message: '用户名不能已 - 开头或结尾 ({PATH})',
      },
      {
        validator(username) {
          try {
            /* eslint-disable */
            new Types.ObjectId(username)
            /* eslint-enable */
          } catch (e) {
            return true
          }
          return true
        },
        message: '用户名不能是 ID ({PATH})',
      },
      {
        validator: reserve,
        message: '用户名被系统保留 ({PATH})',
      },
      {
        isAsync: true,
        async validator(value) {
          if (this.get('admin')) {
            return true
          }
          let auth: Auth | null = await Auth.findOne({
            user: this,
            column: 'username',
            deletedAt: {
              $exists: false,
            }
          }).read('primary').exec()
          return !auth || (auth.get('createdAt').getTime() + 86400 * 1000 * 30) < Date.now()
        },
        message: '用户名只能一个月内只能改变一次 ({PATH})',
      },
      {
        isAsync: true,
        async validator(value) {
          let auth = await Auth.findOne({
            column: 'username',
            value: value.toLowerCase()
          }).read('primary').exec()
          return !auth || this.equals(auth.get('user'))
        },
        message: '用户名已存在 ({PATH})',
      }
    ],
  },

  password: {
    type: String,
    set(password) {
      if (this.$_setPassword === undefined) {
        this.$_setPassword = this.get('password')
      }
      return password
    },
    validate: [
      {
        validator(password) {
          if (this.$_oldPassword !== undefined) {
            return password || !this.$_setPassword
          }
          return true
        },
        message: '旧密码不能为空 ({PATH})',
      },
      {
        validator(password) {
          return this.$_newPassword === undefined || this.$_newPassword
        },
        message: '新密码不能为空 ({PATH})',
      },
      {
        validator(password) {
          if (this.$_newPassword === undefined) {
            return true
          }
          return typeof this.$_newPassword === 'string' && this.$_newPassword.length >= 6 && this.$_newPassword.length <= 64
        },
        message: '新密码长度不能少于 6 或大于 64 字节 ({PATH})',
      },
      {
        validator(password) {
          if (this.$_newPasswordAgain !== undefined) {
            return this.$_newPassword === this.$_newPasswordAgain
          }
          return true
        },
        message: '两次输入的新密码不相同 ({PATH})',
      },
      {
        validator(password) {
          if (password || typeof password === 'string') {
            return !!password
          }
          return true
        },
        message: '密码不能为空 ({PATH})',
      },
      {
        validator(password) {
          if (password) {
            return password.length >= 6 && password.length <= 64
          }
          return true
        },
        message: '密码长度不能少于 6 或大于 64 字节 ({PATH})',
      },
      {
        validator(password) {
          if (this.$_passwordAgain !== undefined) {
            return !password || password === this.$_passwordAgain
          }
          return true
        },
        message: '两次输入的密码不相同 ({PATH})',
      },
      {
        isAsync: true,
        async validator(password) {
          if (!this.$_oldPassword) {
            return true
          }
          if (await this.comparePassword(this.$_oldPassword)) {
            return true
          }
          return false
        },
        message: '旧密码不正确 ({PATH})',
      },
    ],
  },

  locale: {
    type: String,
    default: 'en',
    trim: true,
    set(value) {
      let result = String(value).trim().split(/[_-]/)
      result[0] = result[0].toLowerCase()
      if (result[2]) {
        result[2] = result[2].toUpperCase()
        if (result[1]) {
          result[1] = result[1].charAt(0).toUpperCase() + result[1].substr(1)
        }
      } else {
        result[1] = result[1].toUpperCase()
      }
      return result.join('-')
    },

    validate: [
      {
        validator(value) {
          return !!locale[value]
        },
        message: '区域不存在 ({PATH})',
      },
    ]
  },

  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  updater: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  application: {
    type: Schema.Types.ObjectId,
    // ref: 'Application',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },


  meta: {
    type: Schema.Types.ObjectId,
    ref: 'Meta',
  },

  // 理由
  reason: {
    type: String,
    trim: true,
    maxlength: [255, '理由不能大于 255 字节 ({PATH})'],
    validate: [
      {
        validator(reason) {
          if (this.isModified('black')) {
            return reason
          }
          return true
        },
        message: '理由不能为空 ({PATH})',
      },
    ]
  },

  // 管理员
  admin: {
    index: true,
    type: Boolean,
    default: false,
  },

  // 黑名单
  black: {
    index: true,
    type: Boolean,
    default: false,
  },

  auths: [
    {
      type: String,
      index: true,
      required: [true, '认证名不能为空'],
      maxlength: [32, '认证名长度不能大于 32 字节 ({PATH})'],
    }
  ],


  registerIp: {
    type: String,
  },

  nickname: {
    type: String,
    required: [true, '名称不能为空'],
    trim: true,
    maxlength: [32, '名称长度不能大于 32 字节 ({PATH})'],
  },

  avatar: {
    type: String,
    default: '',
    set(value) {
      if (this.$_avatar === undefined) {
        this.$_avatar = this.get('avatar')
      }
      return value
    }
  },

  description: {
    type: String,
    default: '',
    maxlength: [255, '描述长度不能大于 255 字节 ({PATH})'],
  },

  gender: {
    type: String,
    lowercase: true,
    trim: true,
    default: '',
    enum: ['', 'male', 'female'],
  },

  birthday: {
    type: Date,
    min: [new Date('1900-01-01'), '生日不能小于 1900 年或大于 2016 年 ({PATH})'],
    max: [new Date('2016-01-01'), '生日不能小于 1900 年或大于 2016 年 ({PATH})'],
  },
})


schema.virtual('url').get(function () {
  return '/' + encodeURIComponent(this.get('username'))
})

schema.virtual('oldPassword').set(function (value) {
  this.$_oldPassword = value
})

schema.virtual('passwordAgain').set(function (value) {
  this.$_passwordAgain = value
})

schema.virtual('newPassword').set(function (value) {
  this.$_newPassword = value
})

schema.virtual('newPasswordAgain').set(function (value) {
  this.$_newPasswordAgain = value
})


schema.set('toJSON', {
  transform(doc, ret) {
    let tokenUser = doc.getToken() ? doc.getToken().get('user') : undefined
    if (!tokenUser || tokenUser.get('black') || !tokenUser.get('admin')) {
      delete ret.registerIp
    }
    if (tokenUser && tokenUser.equals(this)) {
      ret.password = ret.password ? true : false
    } else {
      delete ret.password
    }

    ret.url = doc.get('url')
  }
})



/**
 * 密码验证
 * @param  string password
 * @return boolean
 */
schema.methods.comparePassword = function comparePassword(password) {
  return new Promise((resolve, reject) => {
    let hash = this.$_setPassword === undefined ? this.get('password') : this.$_setPassword
    if (!password || typeof password !== 'string' || !hash) {
      return resolve(false)
    }
    bcrypt.compare(password, hash, (err, res) => {
      if (err) {
        return reject(err)
      }
      resolve(res)
    })
  })
}

schema.methods.canHasAdmin = async function canHasAdmin(token?: Token) {
  if (!this.get('admin')) {
    this.throw(403, 'You do not have permission')
  }
}

schema.methods.canNotBlack = async function canNotBlack(token?: Token) {
  if (!this.get('black')) {
    this.throw(403, `Your account is blocked because of "${this.get('reason')}"`, {black: true})
  }
}



schema.methods.canLogin = async function canLogin(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: false})
}


schema.methods.canOauth = async function canOauth(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canApplication(token, {value: false})
  await token.canUser(token, {value: this})
  await this.canNotBlack(token)
}

schema.methods.canList = async function canList(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'user/list'})
  await token.canScope(token, {path: 'admin'})

  let tokenUser = token.get('user')
  await tokenUser.canNotBlack(token)
  await tokenUser.canHasAdmin(token)
}

schema.methods.canRead = async function canRead(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  let tokenUser = token.get('user')
  if (!this.equals(tokenUser)) {
    await token.canScope(token, {path: 'user/read'})
    await token.canScope(token, {path: 'admin'})
    await tokenUser.canNotBlack(token)
  }
}

schema.methods.canSave = async function canSave(token?: Token, {username, passowrd}: {username?: boolean, passowrd?: boolean}) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'user/save'})
  if (!this.isNew && (username || this.isModified('username'))) {
    await token.canScope(token, {path: 'user/username'})
  }
  if (!this.isNew && (passowrd || this.isModified('passowrd'))) {
    await token.canScope(token, {path: 'user/passowrd'})
  }

  let tokenUser = token.get('user')
  if (!this.equals(tokenUser)) {
    await token.canScope(token, {path: 'admin'})
  }

  await tokenUser.canNotBlack(token)
  if (!this.equals(tokenUser)) {
    await tokenUser.canHasAdmin(token)
  }
}


schema.methods.canBlack = async function canBlack(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'user/black'})
  await token.canScope(token, {path: 'admin'})
  let tokenUser = token.get('user')
  await tokenUser.canNotBlack(token)
  await tokenUser.canHasAdmin(token)
  if (this.get('block')) {
    this.throw(403, 'The user is blacklisted')
  }
}

schema.methods.canRestore = async function canRestore(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'user/restore'})
  await token.canScope(token, {path: 'admin'})
  let tokenUser = token.get('user')
  await tokenUser.canNotBlack(token)
  await tokenUser.canHasAdmin(token)
  if (!this.get('block')) {
    this.throw(403, 'The user is not blacklisted')
  }
}



schema.statics.Auth = Auth
schema.statics.Meta = Meta
// schema.statics.Message = Message

/**
 * 简单的  Populate
 * @param  object | string populate [description]
 * @return object          [description]
 */
schema.statics.refPopulate = function refPopulate(path: string | Object): Object {
  let result: string | Object = path
  if (typeof result === 'string') {
    result = {
      path,
    }
  }

  return {
    select: {
      username: 1,
      nickname: 1,
      gender: 1,
      description: 1,
      avatar: 1,
    },
    ...result,
  }
}

/**
 * meta  的引用
 * @param  {[type]} all [description]
 * @return {[type]}     [description]
 */
schema.statics.metaPopulate = function metaPopulate(all: boolean = false): Object {
  if (all) {
    return {
      path: 'meta',
    }
  }

  return {
    path: 'meta',
    select: {
      message: 0,
    },
  }
}




/**
 * 按照账号查询
 * @param  string account
 * @return boolean | User
 */
schema.statics.findByAuth = async function findByAuth(val, columns: string[] | string = ['id', 'email', 'phone', 'username']): Object | null {
  let value = String(val).toLowerCase().trim()

  if (!value) {
    return null
  }
  if (!columns || columns.length === 0) {
    return null
  }


  let value2
  let column
  if (!Array.isArray(columns)) {
    column = columns
  } else if (/^[0-9a-z]{24}$/.test(value) && columns.indexOf('id') !== -1) {
    column = 'id'
  } else if ((value2 = validator.email(value)) && columns.indexOf('email') !== -1) {
    column = 'email'
    value = value2
  } else if ((value2 = validator.mobilePhone(value)) && columns.indexOf('phone') !== -1) {
    column = 'phone'
    value = value2
  } else if (columns.indexOf('username') !== -1) {
    column = 'username'
  } else {
    column = ''
  }
  if (!column) {
    return null
  }

  if (column === 'id') {
    let user = await this.findById(value).exec()
    return user
  }

  let query: Object = {
    value,
    column,
  }

  if (column !== 'username') {
    query.deletedAt = {$exists: false}
  }

  let auth = await Auth.findOne(query).populate('user').exec()
  return auth ? auth.get('user') : null
}

/**
 * 新增自动添加 meta
 * @return {[type]} [description]
 */
schema.preAsync('save', async function () {
  // 添加 meta
  if (!this.get('meta')) {
    this.set('meta', this.get('_id'))
    let meta = new Meta({
      _id: this.get('_id')
    })
    await meta.save()
  }
})



/**
 * 加密密码
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
schema.pre('save', function (next) {
  let password = this.get('password')
  if (!password || !this.isModified('password')) {
    return next()
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err)
    }
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) {
        return next(err)
      }
      this.set('password', hash)
      next()
    })
  })
})



/**
 * 自动添加更新时间
 * @return {[type]} [description]
 */
schema.pre('save', function (next) {
  if (!this.isNew) {
    this.set('updatedAt', new Date)
  }
  return next()
})



/**
 * 修改用户名
 * @return {[type]} [description]
 */
schema.preAsync('save', async function () {
  if (!this.isModified('username') && !this.isNew) {
    return
  }
  let value: string = this.get('username').toLowerCase()
  let auth: Auth | null = await Auth.findOne({
    column: 'username',
    value,
    deletedAt: {
      $exists: false,
    }
  }).read('primary').exec()


  this.oncePost(async function () {
    // 不是自己的 需要删除
    if (auth && !this.equals(auth.get('user'))) {
      auth.set('deletedAt', new Date)
      await auth.save()
    }


    // 自改了大小写不修改 auth
    if (auth) {
      return
    }


    // 删除老的
    await Auth.update({
      user: this,
      column: 'username',
      deletedAt: {
        $exists: false,
      }
    },
    {
      $set: {
        deletedAt: new Date
      }
    }).exec()


    // 写入新的
    auth = new Auth({
      user: this.get('_id'),
      column: 'username',
      value,
    })
    await auth.save()
  })
})



/**
 * 修改密码
 * @type {[type]}
 */
schema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) {
    return next()
  }

  this.oncePost(async function () {
    let date = this.get('updatedAt')
    let token = this.getToken()
    let query: Object = {
      user: this,
      deletedAt: {
        $exists: false,
      },
      createdAt: {
        $lt: date,
      },
    }

    if (token) {
      query._id = {$ne: token.get('_id')}
    }

    await require('./token').default.updateMany(query, {
      $set: {
        deletedAt: date,
      }
    }, {w: 0}).exec()

    // token 等于自己删除
    if (token && this.equals(token.get('user'))) {
      token.set('deletedAt', date)
      await token.save()
    }
  })
})


/**
 * 删除密码信息
 * @return {[type]} [description]
 */
schema.post('save', function () {
  delete this.$_setPassword
  delete this.$_oldPassword
  delete this.$_passwordAgain
  delete this.$_newPassword
  delete this.$_newPasswordAgain
})




/**
 * 创建表的时候 预注册
 * @param  {[type]} User [description]
 * @return {[type]}      [description]
 */
schema.on('init', async function (User) {
  let user = await User.findOne().exec()

  if (user) {
    return
  }

  user = new User({
    username: 'admin',
    nickname: 'admin',
    password: '123456',
    admin: true,
  })

  await user.save()

  console.log('Create Admin User username: admin, password: 123456')
})


export default model('User', schema)
