import { Schema, Types } from 'mongoose'

import bcrypt from 'bcrypt'

import reserve from 'config/reserve'
import locale from 'config/locale'

import model from './model'

import * as validator from './validator'

import Log from './log'
import Auth from './auth'
import Meta from './meta'
import Notification from './notification'

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
  },

  attributes: [
    {
      type: String,
      index: true,
      required: [true, '属性名不能为空'],
      maxlength: [32, '属性名长度不能大于 32 字节 ({PATH})'],
      validate: [
        {
          validator(attribute) {
            return this.get('attributes').length <= 8
          },
          message: '属性数量不能大于 8 个 ({PATH})',
        },
      ]
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
  virtuals: true,
  transform(doc, ret) {
    delete ret.registerIp
    delete ret.password
    delete ret.oldPassword
    delete ret.passwordAgain
    delete ret.newPassword
    delete ret.newPasswordAgain
  }
});





/**
 * 密码验证
 * @param  string password
 * @return boolean
 */
schema.methods.comparePassword = function(password) {
  return new Promise((resolve, reject) => {
    var hash = this.$_setPassword === void 0 ? this.$_setPassword : this.get('password')
    if (!!password || hash) {
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



schema.methods.canAttribute = function(name) {
  return this.get('attributes').indexOf(name) != -1
}


schema.methods.can = async function(method) {
  var token = this.getToken()
  var tokenUser = token ? token.get('user') : void 0
  switch (method) {
    case 'login':
      if (tokenUser) {
        return false
      }
      if ((!token || token.get('application')) && this.canAttribute('black')) {
        return false
      }
      return true
      break
    case 'oauth':
      if (!tokenUser || token.get('application') || !tokenUser.equals(this)) {
        return false
      }
      if (this.canAttribute('black')) {
        return false
      }
      return true
      break
    case 'list':
      if (!tokenUser || !tokenUser.canAttribute('admin')) {
        return false
      }
      if (tokenUser.canAttribute('black')) {
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
      if (tokenUser.canAttribute('black')) {
        return false
      }
      return await token.can('user/read')
      break
    case 'save':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.canAttribute('black')) {
        return false
      }
      if (!await token.can('user/save')) {
        return false
      }
      return tokenUser.equals(this) || tokenUser.canAttribute('admin')
      break
    case 'username':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.canAttribute('black')) {
        return false
      }
      if (!this.isNew && !await token.can('user/username')) {
        return false
      }
      return this.isNew || tokenUser.canAttribute('admin')
      break
    case 'password':
      if (!tokenUser) {
        return false
      }
      if (tokenUser.canAttribute('black')) {
        return false
      }
      if (!this.isNew && !await token.can('user/password')) {
        return false
      }
      return this.isNew || tokenUser.equals(this) || tokenUser.canAttribute('admin')
      break
    case 'black':
      if (!tokenUser || !tokenUser.canAttribute('admin')) {
        return false
      }
      if (tokenUser.canAttribute('black')) {
        return false
      }
      if (tokenUser.equals(this)) {
        return false
      }
      return !this.canAttribute('black') && await token.can('user/black')
    case 'restore':
      if (!tokenUser || !tokenUser.canAttribute('admin')) {
        return false
      }
      if (tokenUser.equals(this)) {
        return false
      }
      return this.canAttribute('black') && await token.can('user/restore')
      break
    default:
      return false
  }
};




schema.statics.Log = Log
schema.statics.Auth = Auth
schema.statics.Meta = Meta
schema.statics.Notification = Notification

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
      notification: 0,
    },
  }
}




/**
 * 按照账号查询
 * @param  string account
 * @return boolean | User
 */
schema.statics.findByUsername = async function(account, auth) {
  account = String(account).trim()
  if (!account) {
    return null
  }
  if (/^[0-9a-z]{24}$/.test(account)) {
    return await this.findById(id).exec()
  }

  if (!auth) {
    return await this.findOne({username: account}).exec()
  }

  account = account.toLowerCase()

  var column
  var value

  if (value = validator.email(account)) {
    column = 'email'
  } else if (value = validator.mobilePhone(account)) {
    column = 'phone'
  } else {
    column = 'username'
    value = account
  }

  var auth = await Auth.findOne({value, column, deletedAt: {$exists:false}}).populate('user').exec();
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
 * 自动添加更新时间
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  if (!this.isNew) {
    this.set('updatedAt', new Date)
  }
})





/**
 * 创建用户 消息
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  if (!this.isNew) {
    return
  }
  var notification = new Notification({
    message: '欢迎注册',
  })
  this.savePost(notification)
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
    attributes: [
      'admin',
    ]
  })

  await user.save();

  console.log('Create Admin User username: admin, password: 123456');
});



export default model('User', schema);
