import {Schema, Types} from 'mongoose'

import ip from 'ip'

import model from './model'

import validator from './validator'

import Authorize from './authorize'
import Application from './application'


const schema = new Schema({
  key: {
    type: String,
    default() {
      return Application.createRandom(8, true)
    },
  },

  type: {
    type: String,
    default: 'access',
    enum: ['access', 'refresh', 'code'],
    index: true,
  },

  state: {
    type: Object,
    default: Object,
  },

  authType: {
    type: String,
    default: 'bearer',
    enum: ['bearer', 'mac'],
    required: true,
  },

  logs: [
    {
      ip: {
        type: String,
        default: '0.0.0.0',
        validate: [
          {
            validator(value) {
              return ip.isV4Format(value) || ip.isV6Format(value)
            },
            message: '"{VALUE}" 不是 IP 地址 ({PATH})',
          },
        ],
      },
      userAgent: {
        type: String,
        default: '',
        maxlength: 255,
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    }
  ],

  scopes: [
    {
      type: String,
      required: [true, '权限名称不能为空 ({PATH})'],
      maxlength: [64, '权限名称长度不能大于 64 字节 ({PATH})'],
      validate: [
        {
          validator(scope) {
            var scopes = this.get('scopes')
            return scopes.length <= 32;
          },
          message: '权限数量不能大于 32 个 ({PATH})',
        },
        {
          validator(scope) {
            return scope
          },
          message: '"{VALUE}" 权限格式不正确 ({PATH})',
        },
      ],
    }
  ],


  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Token',
    index: true,
  },

  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
  },

  application: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    index: true,
  },

  authorize: {
    type: Schema.Types.ObjectId,
    ref: 'Authorize',
    index: true,
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

  expiredAt: {
    type: Date,
    index: true,
    default() {
      var date = new Date;
      switch (this.get('type')) {
        case 'code':
          date.setTime(date.getTime() + 1000 * 300)
          break;
        case 'refresh':
          date.setTime(date.getTime() + 1000 * 86400 * 30)
          break;
        default:
          if (this.get('authType') == 'enum') {
            date.setTime(date.getTime() + 1000 * 86400 * 30)
          } else if (!this.get('application')) {
            date.setTime(date.getTime() + 1000 * 86400 * 30)
          } else {
            date.setTime(date.getTime() + 1000 * 86400 * 1)
          }
      }
      return date;
    }
  },
});



schema.virtual('userAgent').get(function() {
  var logs = this.get('logs')
  if (!logs.length) {
    return
  }
  return logs[logs.length -1].get('userAgent')
})

schema.virtual('ip').get(function() {
  var logs = this.get('logs')
  if (!logs.length) {
    return '0.0.0.*'
  }

  var ip = logs[this.get('type') ? 0 : logs.length - 1].get('ip')
  var separator = ip.indexOf(':') == -1 ? '.' : ':';

  ip = ip.split(separator);
  if (ip.length <= 4) {
    ip[ip.length -1] = '*';
  } else {
    ip[ip.length -1] = '*';
    ip[ip.length -2] = '*';
  }
  return ip.join(separator)
})


schema.virtual('expires_in').get(function() {
  var time = this.get('expiredAt') - Date.now()
  if (time < 1000) {
    return 0
  }
  time = Math.round(time / 1000)
  return time
});

schema.virtual('token_type').get(function() {
  return this.get('authType')
})

schema.virtual('scope').get(function() {
  return this.get('scopes')
})

schema.methods.compareKey = async function(tokenKey) {
  // tokenKey
  if (typeof tokenKey != 'string' || tokenKey.length <= 24 || tokenKey.substr(0, 24) !== this.get('id') || tokenKey.substr(24) !== this.get('key')) {
    return false
  }

  // 被删除 or 已过期
  if (this.get('deletedAt') || this.get('expiredAt').getTime() < Date.now()) {
    return false
  }

  // 客户端的
  var application = this.get('application')
  if (application) {
    if (!application.get) {
      application = await Application.findById(application).exec()
    }
    if (application.get('status') == 'block' || application.get('deletedAt')) {
      return false
    }
  }


  // 认证的
  var authorize = this.get('authorize')
  if (authorize) {
    if (!authorize.get) {
      authorize = await Authorize.findById(authorize).exec()
    }

    if (authorize.get('deletedAt')) {
      return false
    }
  }

  return true
}

schema.methods.canScope = function(value) {
  if (value instanceof Array) {
    value = value.join('/')
  }
  if (!value || value.charAt(0) == '/' || value.indexOf('\\') != -1 || value.indexOf('//') != -1) {
    return false
  }

  value = value.replace(/\*\*/g, '*/*')
  var scopes = this.get('scopes')
  var scope
  var test
  for (let i = 0; i < scopes.length; i++) {
    scope = scopes[i]
    test = new RegExp('^' + scope.replace(/([.?+$^\[\](){}|\\])/g, '\\$1').replace(/(?:\*\*)/g, '.+').replace(/[*]/g, '[^/\r\n\t]+') + '\/?$').test(value)
    if (test) {
      return true
    }
  }
  return false
}

schema.methods.can = async function(path) {
  if (!this.canScope(path)) {
    return false
  }

  var application = this.get('application')
  if (application) {
    if (!application.get) {
      application = await Application.findById(application).exec()
    }
    if (!application.canScope(path)) {
      if (!this.get('user') || !this.get('user').equals(application.get('creator')) || this.get('scopes').length != 1 || this.get('scopes')[0] !== '**') {
        return false
      }
    }
  }
  return true
}

schema.methods.updateLog = function(ctx, api) {
  var ip
  var userAgent
  if (api) {
    ip = Application.forwardIp(ctx)
    if (!ip) {
      return false
    }
    userAgent = Application.forwardUserAgent(ctx, '')
  } else {
    ip = ctx.ip
    userAgent  = ctx.request.header['user-agent'] || ''
  }

  var logs = this.get('logs')
  var log
  for (var i = 0; i < logs.length; i++) {
    log = logs[i]
    if (log.get('ip') == ip && log.get('userAgent') == userAgent && log.get('createdAt').getTime() > (Date.now() - 1000 * 3600)) {
      return false
    }
  }
  logs.push({ip, userAgent});
  if (logs.length >= 100) {
    logs.splice(1, 2)
  }
  if (!this.isNew) {
    this.set('updatedAt', new Date)
  }
  this.set('logs', logs);
  return true
}


schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.key
    delete ret.logs
    delete ret.state
    delete ret.parent
  },
});


export default model('Token', schema);
