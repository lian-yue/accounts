import {Schema, Types} from 'mongoose'

import ip from 'ip'

import model from './model'

import validator from './validator'

import Authorize from './authorize'
import Application from './application'


const schema = new Schema({
  secret: {
    type: String,
    default() {
      return Application.createRandom(8, true)
    },
  },

  type: {
    type: String,
    default: 'access',
    enum: ['access', 'refresh', 'code'],
  },

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

  renewal: {
    type: Boolean,
    default: false,
  },

  parent: {
    type: Schema.Types.ObjectId,
    ref: 'Token',
  },

  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
  },

  authorize: {
    type: Schema.Types.ObjectId,
    ref: 'Authorize',
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
          date.setTime(date.getTime() + 1000 * 86400 * 60)
          break;
        default:
          if (this.get('application')) {
            date.setTime(date.getTime() + 1000 * 86400 * 1)
          } else {
            date.setTime(date.getTime() + 1000 * 86400 * 30)
          }
      }
      return date;
    }
  },


  state: {
    type: Object,
    default: Object,
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
})

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
    return '0.0.0.0'
  }
  return logs[logs.length - 1].get('ip')
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
  return 'bearer'
})

schema.virtual('scope').get(function() {
  return this.get('scopes')
})


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



schema.methods.updateLog = function(ctx, server) {
  var ip
  var userAgent
  if (server) {
    ip = Application.forwardIp(ctx)
    if (!ip) {
      return false
    }
    userAgent = Application.forwardUserAgent(ctx, '')
  } else {
    ip = ctx.ip
    userAgent = ctx.request.header['user-agent'] || ''
  }
  userAgent = userAgent.trim()
  if (this.get('ip') == ip) {
    return false
  }
  var logs = this.get('logs')
  var log = logs.length ? logs[logs.length -1] : {}
  if (log.ip == ip && (!userAgent || log.userAgent == userAgent) && log.createdAt.getTime() > (Date.now() - 600 * 3600)) {
    return false
  }

  logs.push({ip, userAgent})


  if (logs.length > 5) {

    // 一个 ip 最多保存5个副本记录
    var count = 0
    for (var i = 5; i < logs.length; i++) {
      if (logs[i].ip == ip) {
        count++
      }
    }

    if (count > 5) {
      for (var i = 5; i < logs.length; i++) {
        if (logs[i].ip == ip) {
          logs.splice(i, 1)
          break
        }
      }
    }

    // 总共最多保存100个副本记录
    if (logs.length >= 100) {
      logs.splice(4, 2)
    }
  }

  this.set('logs', logs)
  return true
}


schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.secret
    delete ret.parent
    delete ret.state
    delete ret.logs


    var separator = ret.ip.indexOf(':') == -1 ? '.' : ':'
    var ip = ret.ip.split(separator)
    if (ip.length <= 4) {
      ip[ip.length -1] = '*'
    } else {
      ip[ip.length -1] = '*'
      ip[ip.length -2] = '*'
    }
    ret.ip = ip.join(separator)
  },
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



export default model('Token', schema, {
  shardKey: {
    _id: 1,
  },
})
