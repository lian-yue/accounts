import { Schema, Types } from 'mongoose'

import bcrypt from 'bcrypt'

import reserve from 'config/reserve'
import locale from 'config/locale'

import model from './model'

import * as validator from './validator'

import Auth from './auth'
import Meta from './meta'
import Message from './message'

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
          return !validator.mobilePhone(username);
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
            new Types.ObjectId(username)
          } catch (e) {
            return true
          }
          return false
        },
        message: '用户名不能是 ID ({PATH})',
      },
      {
        validator: reserve,
        message: '用户名被系统保留 ({PATH})',
      },
      {
        async validator(value, cb) {
          var auth = await Auth.findOne({column: 'username', value: value.toLowerCase()}).read('primary').exec();
          cb(!auth || this.equals(auth.get('user')))
        },
        message: '用户名已存在 ({PATH})',
      }
    ],
  },

  password: {
    type: String,
    set(password) {
      if (this.$_setPassword === void 0) {
        this.$_setPassword = this.get('password')
      }
      return password
    },
    validate: [
      {
        validator(password) {
          if (this.$_oldPassword !== void 0) {
            return password || !this.$_setPassword
          }
          return true
        },
        message: '旧密码不能为空 ({PATH})',
      },
      {
        validator(password) {
          return this.$_newPassword === void 0 || this.$_newPassword;
        },
        message: '新密码不能为空 ({PATH})',
      },
      {
        validator(password) {
          if (this.$_newPassword !== void 0) {
            return  typeof this.$_newPassword == 'string' && this.$_newPassword.length >= 6 && this.$_newPassword.length <= 64;
          }
          return true;
        },
        message: '新密码长度不能少于 6 或大于 64 字节 ({PATH})',
      },
      {
        validator(password) {
          if (this.$_newPasswordAgain !== void 0) {
            return this.$_newPassword === this.$_newPasswordAgain
          }
          return true;
        },
        message: '两次输入的新密码不相同 ({PATH})',
      },
      {
        validator(password) {
          if (password || typeof password == 'string') {
            return !!password;
          }
          return true;
        },
        message: '密码不能为空 ({PATH})',
      },
      {
        validator(password) {
          if (password) {
            return password.length >= 6 && password.length <= 64;
          }
          return true;
        },
        message: '密码长度不能少于 6 或大于 64 字节 ({PATH})',
      },
      {
        validator(password) {
          if (this.$_passwordAgain !== void 0) {
            return !password || password === this.$_passwordAgain
          }
          return true;
        },
        message: '两次输入的密码不相同 ({PATH})',
      },
      {
        async validator(password, cb) {
          cb(!this.$_oldPassword || await this.comparePassword(this.$_oldPassword))
        },
        message: '旧密码不正确 ({PATH})',
      },
    ],
  },

  locale: {
    type: String,
    default: "en",
    trim: true,
    set(value) {
      value = String(value).trim().split(/[_-]/)
      value[0] = value[0].toLocaleLowerCase()
      if (value[2]) {
        value[2] = value[2].toLocaleUpperCase()
        if (value[1]) {
          value[1][0] = value[1][0].toLocaleUpperCase()
        }
      } else {
        value[1] = value[1].toLocaleUpperCase()
      }
      return value.join('-')
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
      if (this.$_avatar === void 0) {
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
    enum:['', 'male', 'female'],
  },

  birthday: {
    type: Date,
    min: [new Date('1900-01-01'), '生日不能小于 1900 年或大于 2016 年 ({PATH})'],
    max: [new Date('2016-01-01'), '生日不能小于 1900 年或大于 2016 年 ({PATH})'],
  },
});


schema.virtual('url').get(function() {
  return '/' + encodeURIComponent(this.get('username'));
});

schema.virtual('oldPassword').set(function(value) {
  this.$_oldPassword = value;
});

schema.virtual('passwordAgain').set(function(value) {
  this.$_passwordAgain = value;
})

schema.virtual('newPassword').set(function(value) {
  this.$_newPassword = value;
})

schema.virtual('newPasswordAgain').set(function(value) {
  this.$_newPasswordAgain = value;
})


schema.set('toJSON', {
  transform(doc, ret) {
    var tokenUser = doc.getToken() ? doc.getToken().get('user') : void 0
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
});





/**
 * 密码验证
 * @param  string password
 * @return boolean
 */
schema.methods.comparePassword = function(password) {
  return new Promise((resolve, reject) => {
    var hash = this.$_setPassword === void 0 ? this.get('password') : this.$_setPassword
    if (!password || !hash) {
      return resolve(false);
    }
    bcrypt.compare(password, hash, (err, res) => {
      if (err) {
        return reject(err);
      }
      resolve(res);
    });
  });
};




schema.methods.can = async function(method) {
  var token = this.getToken()
  var tokenUser = token ? token.get('user') : void 0
  switch (method) {
    case 'login':
      if (tokenUser) {
        return false
      }
      if ((!token || token.get('application')) && this.get('black')) {
        return false
      }
      return true
      break
    case 'oauth':
      if (!tokenUser || token.get('application') || !tokenUser.equals(this)) {
        return false
      }
      if (this.get('black')) {
        return false
      }
      return true
      break
    case 'list':
      if (!tokenUser || !tokenUser.get('admin')) {
        return false
      }
      if (tokenUser.get('black')) {
        return false
      }
      return await token.can('user/list')
      break
    case 'read':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.equals(this)) {
        return true
      }
      if (tokenUser.get('black')) {
        return false
      }
      return await token.can('user/read')
      break
    case 'save':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.get('black')) {
        return false
      }
      if (!await token.can('user/save')) {
        return false
      }
      return tokenUser.equals(this) || tokenUser.get('admin')
      break
    case 'username':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.get('black')) {
        return false
      }
      if (!this.isNew && !await token.can('user/username')) {
        return false
      }
      return this.isNew || tokenUser.get('admin')
      break
    case 'password':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.get('black')) {
        return false
      }
      if (!this.isNew && !await token.can('user/password')) {
        return false
      }
      return this.isNew || tokenUser.equals(this) || tokenUser.get('admin')
      break
    case 'black':
      if (!tokenUser || !tokenUser.get('admin')) {
        return false
      }
      if (tokenUser.get('black')) {
        return false
      }
      if (tokenUser.equals(this)) {
        return false
      }
      return !this.get('black') && await token.can('user/black')
    case 'restore':
      if (!tokenUser || !tokenUser.get('admin')) {
        return false
      }
      if (tokenUser.equals(this)) {
        return false
      }
      return this.get('black') && await token.can('user/restore')
      break
    default:
      return false
  }
};




schema.statics.Auth = Auth
schema.statics.Meta = Meta
schema.statics.Message = Message

/**
 * 简单的  Populate
 * @param  object | string populate [description]
 * @return object          [description]
 */
schema.statics.refPopulate = function(populate) {
  if (!(populate instanceof Object)) {
    populate = {
      path: populate,
    }
  }

  return Object.assign({
    select: {
      username:1,
      nickname:1,
      gender:1,
      description:1,
      avatar:1,
    },
  }, populate)
}

/**
 * meta  的引用
 * @param  {[type]} all [description]
 * @return {[type]}     [description]
 */
schema.statics.metaPopulate = function(all) {
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
schema.statics.findByAuth = async function(value, column) {
  value = String(value).toLowerCase().trim()
  if (!value) {
    return null
  }

  if (!column || Array.isArray(column)) {
    if (!column) {
      column = ['id', 'email', 'phone', 'username']
    }
    let value2
    if (/^[0-9a-z]{24}$/.test(value) && column.indexOf('id') != -1) {
      column = 'id'
    } else if ((value2 = validator.email(value)) && column.indexOf('email') != -1) {
      column = 'email'
      value = value2
    } else if ((value2 = validator.mobilePhone(value)) && column.indexOf('phone') != -1) {
      column = 'phone'
      value = value2
    } else if (column.indexOf('username') != -1) {
      column = 'username'
    } else {
      column = ''
    }
    if (!column) {
      return null
    }
  }

  if (column == 'id') {
    return await this.findById(value).exec()
  }

  var query = {
    value,
    column,
  }

  if (column != 'username') {
    query.deletedAt = {$exists: false}
  }

  var auth = await Auth.findOne(query).populate('user').exec();
  return auth ? auth.get('user') : null
}

/**
 * 新增自动添加 meta
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  // 添加 meta
  if (!this.get('meta')) {
    this.set('meta', this.get('_id'))
    var meta = new Meta({
      _id: this.get('_id'),
    })
    await meta.save()
  }
});



/**
 * 加密密码
 * @param  {Function} next [description]
 * @return {[type]}        [description]
 */
schema.pre('save', function(next) {
  var password = this.get('password');
  if (!password || !this.isModified('password')) {
    return next();
  }
  bcrypt.genSalt(10, (err, salt) => {
    if (err) {
      return next(err);
    }
    bcrypt.hash(password, salt, (err, hash) => {
      if (err) {
        return next(err)
      }
      this.set('password', hash);
      next();
    });
  });
});



/**
 * 自动添加更新时间
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  if (!this.isNew) {
    this.set('updatedAt', new Date)
  }
})



/**
 * 修改用户名
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  if (!this.isModified('username') && !this.isNew) {
    return
  }
  var value = this.get('username').toLowerCase()
  var auth = await Auth.findOne({column:'username', value, deletedAt:{$exists:false}}).read('primary').exec();
  var removeAuth
  if (auth && !this.equals(auth.get('user'))) {
    auth.set('deletedAt', new Date)
    removeAuth = auth
    auth = null
  }

  if (!auth) {
    auth = new Auth({
      user: this.get('_id'),
      column: 'username',
      value,
    })
  }

  this.savePost(async () => {
    if (removeAuth) {
      await removeAuth.save()
    }
    if (auth.isNew) {
      await Auth.remove({user: this, column:'username', deletedAt:{$exists:false}}).exec()
      await auth.save()
    }
  })
})




/**
 * 修改密码
 * @type {[type]}
 */
schema.pre('save', async function() {
  if (!this.isModified('password') || this.isNew) {
    return
  }
  this.savePost(async () => {
    var date = this.get('updatedAt')
    var token = this.getToken()
    var query = {
      user: this,
      deletedAt: {$exists: false},
      createdAt: {$lt: date},
    }
    if (token) {
      query._id = {$ne: token.get('_id')}
    }
    await require('./token').default.updateMany(query, {$set: {deletedAt: date}}, {w:0}).exec()

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
schema.post('save', function() {
  delete this.$_setPassword
  delete this.$_oldPassword
  delete this.$_passwordAgain
  delete this.$_newPassword
  delete this.$_newPasswordAgain
});



/**
 * 创建表的时候 预注册
 * @param  {[type]} User [description]
 * @return {[type]}      [description]
 */
schema.on('init', async function(User) {
  var user =  await User.findOne().exec();
  if (user) {
    return;
  }

  user = new User({
    username: 'admin',
    nickname: 'admin',
    password: '123456',
    admin: true,
  })

  await user.save();

  console.log('Create Admin User username: admin, password: 123456');
});



export default model('User', schema);
