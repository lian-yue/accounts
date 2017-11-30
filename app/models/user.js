/* @flow */
import { Schema, Types, Error as MongooseError } from 'mongoose'
import bcrypt            from 'bcrypt'

import reserve          from 'config/reserve'

import locale from './locale/default'

import createError from './createError'

import  { matchEmail, matchMobilePhone } from './utils'

import model            from './model'

import Auth     from './auth'
import Meta     from './meta'
import Message  from './message'



const schema: Schema<UserModel> = new Schema({
  username: {
    type: String,
    unique: true,
    trim: true,
    required: true,
    minlength: 3,
    maxlength: 16,
    match: /^([0-9a-z]+\-)*[0-9a-z]+$/i,
    validate: [
      {
        type: 'notphone',
        message: locale.getLanguageValue(['errors', 'notphone']),
        validator(username) {
          return !matchMobilePhone(username)
        },
      },
      {
        type: 'notid',
        message: locale.getLanguageValue(['errors', 'notid']),
        validator(username) {
          try {
            // eslint-disable-next-line
            new Types.ObjectId(username)
          } catch (e) {
            return true
          }
          return true
        },
      },
      {
        type: 'reserve',
        message: locale.getLanguageValue(['errors', 'reserve']),
        validator: reserve,
      },
      {
        isAsync: true,
        type: 'hasexist',
        message: locale.getLanguageValue(['errors', 'hasexist']),
        async validator(value) {
          let auth = await Auth.findOne({
            column: 'username',
            value: value.toLowerCase()
          }).read('primary').exec()
          return !auth || this.equals(auth.get('user'))
        },
      }
    ],
  },

  password: {
    type: String,
    set(password) {
      if (this._password === undefined) {
        this._password = this.get('password')
      }
      return password
    },
    required: [
      function () {
        if (this.get('password') || typeof this.get('password') === 'string') {
          return true
        }
        return false
      },
      locale.getLanguageValue(['errors', 'required']),
    ],

    validate: [
      {
        validator(value) {
          if (value === undefined) {
            return true
          }
          if (typeof value === 'string' && value.length >= 6) {
            return true
          }
          this.invalidate('password', new MongooseError.ValidatorError({
            path: 'password',
            minlength: 6,
            type: 'minlength',
            message: locale.getLanguageValue(['errors', 'minlength']),
          }))
        },
      },
      {
        validator(value) {
          if (value === undefined) {
            return true
          }
          if (typeof value === 'string' && value.length <= 64) {
            return true
          }

          this.invalidate('password', new MongooseError.ValidatorError({
            path: 'password',
            maxlength: 64,
            type: 'maxlength',
            message: locale.getLanguageValue(['errors', 'maxlength']),
          }))
        },
      },


      {
        validator(password) {
          if (!this.$isValid('oldPassword')) {
            return true
          }
          if (this._oldPassword === undefined || this._oldPassword || !this._password) {
            return true
          }
          this.invalidate('oldPassword', locale.getLanguageValue(['errors', 'required']), undefined, 'required')
        },
      },
      {
        validator(password) {
          if (!this.$isValid('newPassword')) {
            return true
          }
          if (this._newPassword === undefined || this._newPassword) {
            return true
          }
          this.invalidate('newPassword', locale.getLanguageValue(['errors', 'required']), undefined, 'required')
        },
      },

      {
        validator(password) {
          if (!this.$isValid('newPassword')) {
            return true
          }
          let value = this._newPassword
          if (value === undefined) {
            return true
          }
          if (typeof value === 'string' && value.length >= 6) {
            return true
          }
          this.invalidate('newPassword', new MongooseError.ValidatorError({
            path: 'newPassword',
            minlength: 6,
            type: 'minlength',
            message: locale.getLanguageValue(['errors', 'minlength']),
          }))
        },
      },
      {
        validator(password) {
          if (!this.$isValid('newPassword')) {
            return true
          }
          let value = this._newPassword
          if (value === undefined) {
            return true
          }

          if (typeof value === 'string' && value.length <= 64) {
            return true
          }

          this.invalidate('newPassword', new MongooseError.ValidatorError({
            path: 'newPassword',
            maxlength: 64,
            type: 'maxlength',
            message: locale.getLanguageValue(['errors', 'maxlength']),
          }))
        },
      },
      {
        validator(password) {
          let value = this._newPasswordAgain
          if (value === undefined || this._newPassword === value) {
            return true
          }
          this.invalidate('newPasswordAgain', locale.getLanguageValue(['errors', 'notsame']), undefined, 'notsame')
        },
      },
      {
        validator(password) {
          let value = this._passwordAgain
          if (value === undefined || password === value) {
            return true
          }
          this.invalidate('passwordAgain', locale.getLanguageValue(['errors', 'notsame']), undefined, 'notsame')
        },
      },
      {
        isAsync: true,
        async validator(password) {
          if (!this.$isValid('oldPassword')) {
            return true
          }
          let value = this._oldPassword
          if (value === undefined || this._password) {
            return true
          }
          if (await this.comparePassword(value)) {
            return true
          }
          this.invalidate('oldPassword', locale.getLanguageValue(['errors', 'incorrect']), undefined, 'incorrect')
        },
      },
    ],
  },

  locale: {
    type: String,
    default: 'en',
    trim: true,
    set(value) {
      return locale.formatName(value)
    },

    validate: [
      {
        type: 'match',
        validator(value) {
          return !!locale.nameList[value]
        },
        message: locale.getLanguageValue(['errors', 'match']),
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
    ref: 'Application',
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
    maxlength: 255,
    required: [
      function () {
        return this.isModified('black')
      },
      locale.getLanguageValue(['errors', 'required']),
    ],
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
      required: true,
      maxlength: 32,
    }
  ],


  registerIp: {
    type: String,
  },

  nickname: {
    type: String,
    trim: true,
    required: true,
    maxlength: 16,
  },

  avatar: {
    type: String,
    default: '',
    set(value) {
      if (this._avatar === undefined) {
        this._avatar = this.get('avatar')
      }
      return value
    }
  },

  description: {
    type: String,
    default: '',
    maxlength: 255,
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
    min: new Date('1900-01-01'),
    max: new Date('2016-01-01'),
  },
})


schema.virtual('url').get(function () {
  return '/' + encodeURIComponent(this.get('username'))
})

schema.virtual('oldPassword').set(function (value) {
  this._oldPassword = value
})

schema.virtual('passwordAgain').set(function (value) {
  this._passwordAgain = value
})

schema.virtual('newPassword').set(function (value) {
  this._newPassword = value
})

schema.virtual('newPasswordAgain').set(function (value) {
  this._newPasswordAgain = value
})

schema.virtual('preAvatar').set(function (value) {
  this._preAvatar = value
})


schema.set('toJSON', {
  virtuals: true,
  transform(doc: UserModel, ret: Object) {
    delete ret.oldPassword
    delete ret.passwordAgain
    delete ret.newPassword
    delete ret.newPasswordAgain
    delete ret.preAvatar

    let token = doc.getToken()
    let user = token ? token.get('user') : undefined
    let admin = user && !user.get('black') && user.get('admin')
    let me = user && user.equals(doc)


    if (!admin) {
      delete ret.registerIp
    }

    if (me || admin) {
      ret.password = ret.password ? true : false
    } else {
      delete ret.password
    }

    // 已屏蔽的用户 对外 不返回 名称 头像 描述
    if (ret.black && !admin && !me) {
      ret.nickname = '***'
      ret.avatar = ''
      ret.description = '****'
    }
  },
})



/**
 * 密码验证
 * @param  string password
 * @return boolean
 */
schema.methods.comparePassword = async function comparePassword(password) {
  if (!password || typeof password !== 'string') {
    return false
  }
  let hash = this._password === undefined ? this.get('password') : this._password
  if (!hash || hash !== 'string') {
    return false
  }
  let compare = await bcrypt.compare(password, hash)
  return compare
}

schema.methods.canHasAdmin = async function canHasAdmin(token?: TokenModel) {
  if (this.get('admin')) {
    return
  }
  throw createError(403, 'permission')
}


schema.methods.canNotBlack = async function canNotBlack(token?: TokenModel) {
  if (!this.get('black')) {
    return
  }
  throw createError(403, 'black', { path: 'user', reason: this.get('reason') })
}



schema.methods.canLogin = async function canLogin(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: false })
  if (token.get('application')) {
    await this.canNotBlack(token)
  }
}


schema.methods.canOauth = async function canOauth(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canApplication(token, { value: false })
  await token.canUser(token, { value: this, black: true })
}

schema.methods.canList = async function canList(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canScope(token, { path: 'user/list', admin: true })
  await token.canUser(token, { value: true, admin: true })
}

schema.methods.canRead = async function canRead(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  if (!this.equals(token.get('user'))) {
    await token.canScope(token, { path: 'user/read' })
    await token.canUser(token, { value: true, black: true })
  }
}

schema.methods.canSave = async function canSave(token?: TokenModel, { username, password }: { username?: boolean, password?: boolean }) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  let admin = !this.equals(token.get('user'))
  await token.canScope(token, { path: 'user/save', admin })
  await token.canUser(token, { value: true, admin })
}


schema.methods.canAdmin = async function canAdmin(token?: TokenModel, { value }: { value?: boolean } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canScope(token, { path: 'user/admin', admin: true })
  await token.canUser(token, { value: true, admin: true })

  if (this.equals(token.get('user'))) {
    throw createError(403, 'notself')
  }

  if (typeof value !== 'undefined' && !this.isModified('admin') && this.get('admin') === value) {
    throw createError(403, 'hassame', { path: 'admin' })
  }
}


schema.methods.canBlack = async function canBlack(token?: TokenModel, { value }: { value?: boolean } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  await token.canScope(token, { path: 'user/black', admin: true })
  await token.canUser(token, { value: true, admin: true })

  if (this.equals(token.get('user'))) {
    throw createError(403, 'notself')
  }

  if (typeof value !== 'undefined' && !this.isModified('black') && this.get('black') === value) {
    throw createError(403, 'hassame', { path: 'black' })
  }
}

schema.statics.Auth = Auth
schema.statics.Meta = Meta
schema.statics.Message = Message

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
schema.statics.findByAuth = async function findByAuth(val, columns: string[] | string = ['id', 'email', 'phone', 'username']): Promise<UserModel | void> {
  let value = String(val).toLowerCase().trim()

  if (!value) {
    return
  }
  if (!columns || columns.length === 0) {
    return
  }


  let value2
  let column
  if (!Array.isArray(columns)) {
    column = columns
  } else if (columns.length === 1) {
    column = columns[0]
  } else if (/^[0-9a-z]{24}$/.test(value) && columns.indexOf('id') !== -1) {
    column = 'id'
  } else if ((value2 = matchEmail(value)) && columns.indexOf('email') !== -1) {
    column = 'email'
    value = value2
  } else if ((value2 = matchMobilePhone(value)) && columns.indexOf('phone') !== -1) {
    column = 'phone'
    value = value2
  } else if (columns.indexOf('username') !== -1) {
    column = 'username'
  } else {
    column = ''
  }
  if (!column) {
    return
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
    query.deletedAt = { $exists: false }
  }

  let auth = await Auth.findOne(query).populate('user').exec()
  return auth ? auth.get('user') : undefined
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
schema.preAsync('save', async function () {
  let password = this.get('password')
  if (!password || !this.isModified('password')) {
    return
  }
  let salt = await bcrypt.genSalt(10)
  let hash = await bcrypt.hash(password, salt)
  this.set('password', hash)
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
 * 用户名
 * @return {[type]} [description]
 */
schema.preAsync('save', async function () {
  if (!this.isModified('username') && !this.isNew) {
    return
  }
  let value: string = this.get('username').toLowerCase()
  let auth: ?Auth = await Auth.findOne({
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
      query._id = { $ne: token.get('_id') }
    }

    await require('./token').default.updateMany(query, {
      $set: {
        deletedAt: date,
      }
    }, { w: 0 }).exec()

    // token 等于自己删除
    if (token && this.equals(token.get('user'))) {
      token.set('deletedAt', date)
      await token.save()
    }
  })

  return next()
})


/**
 * 删除密码信息
 * @return {[type]} [description]
 */
schema.post('save', function () {
  delete this._password
  delete this._oldPassword
  delete this._passwordAgain
  delete this._newPassword
  delete this._newPasswordAgain
  delete this._preAvatar
})




/**
 * 创建表的时候 预注册
 * @param  {[type]} User [description]
 * @return {[type]}      [description]
 */
schema.on('init', async function (User: Class<UserModel>) {
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


export default (model('User', schema): Class<UserModel>)
