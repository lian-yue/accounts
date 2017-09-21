/* @flow */
import {Schema} from 'mongoose'

import ip from 'ip'

import model from './model'


const schema = new Schema({
  secret: {
    type: String,
    default() {
      return require('./application').default.createRandom(8, true)
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
            return this.get('scopes').length <= 32
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
      let date = new Date
      switch (this.get('type')) {
        case 'code':
          date.setTime(date.getTime() + 1000 * 300)
          break
        case 'refresh':
          date.setTime(date.getTime() + 1000 * 86400 * 60)
          break
        default:
          if (this.get('application')) {
            date.setTime(date.getTime() + 1000 * 86400 * 1)
          } else {
            date.setTime(date.getTime() + 1000 * 86400 * 30)
          }
      }
      return date
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

schema.virtual('userAgent').get(function () {
  let logs = this.get('logs')
  if (!logs.length) {
    return
  }
  return logs[logs.length - 1].get('userAgent')
})

schema.virtual('ip').get(function () {
  let logs = this.get('logs')
  if (!logs.length) {
    return '0.0.0.0'
  }
  return logs[logs.length - 1].get('ip')
})

schema.virtual('expires_in').get(function () {
  let time = this.get('expiredAt') - Date.now()
  if (time < 1000) {
    return 0
  }
  time = Math.round(time / 1000)
  return time
})

schema.virtual('token_type').get(function () {
  return 'bearer'
})

schema.virtual('scope').get(function () {
  return this.get('scopes')
})


schema.methods.canScope = async function canScope(
  token?: {modelName: 'Token'},
  {
    path: optPath,
    client,
    application: optApplication,
  }: {
    path: string | string[],
    client: boolean,
    application: boolean,
  } = {
    path: '/',
    client: true,
    application: true
  }
): Promise<void> {
  let path: string | string[] = optPath
  if (path instanceof Array) {
    path = path.join('/')
  }
  if (!path || path.charAt(0) === '/' || path.indexOf('\\') !== -1 || path.indexOf('//') !== -1) {
    this.throw(500, '`path` is incorrect')
  }

  path = path.replace(/\*\*/g, '*/*')
  let scopes = this.get('scopes')
  let scope
  let test
  for (let i = 0; i < scopes.length; i++) {
    scope = scopes[i]
    test = new RegExp('^' + scope.replace(/([.?+$^\[\](){}|\\])/g, '\\$1').replace(/(?:\*\*)/g, '.+').replace(/[*]/g, '[^/\r\n\t]+') + '\/?$').test(path)
    if (test) {
      break
    }
  }
  if (!test) {
    this.throw(400, '`scope` does not match')
  }

  if (optApplication && this.get('application')) {
    let application = this.get('application')
    if (!application.get) {
      application = await require('./application').default.findById(application).exec()
    }
    await application.canScope(this, {path: optPath, client})
  }
}

schema.methods.canUser = async function canUser(token?: {modelName: 'Token'}, {value}: {value: boolean | {modelName: 'User'}}) {
  let user = this.get('user')
  if (typeof value === 'boolean') {
    if (Boolean(user) !== value) {
      if (value) {
        this.throw(401, 'Not logged in')
      } else {
        this.throw(403, 'You are logged in')
      }
    }
  } else {
    if (!user) {
      this.throw(401, 'Not logged in')
    } else if (!user.equals(value)) {
      this.throw(403, 'You do not have permission')
    }
  }
}


schema.methods.canApplication = async function canApplication(token?: {modelName: 'Token'}, {value}: {value: boolean | {modelName: 'Application'}}) {
  let application = this.get('application')
  if (typeof value === 'boolean') {
    if (Boolean(application) !== value) {
      this.throw(400, 'Token application is incorrect')
    }
  } else {
    if (!application || !application.equals(value)) {
      this.throw(400, 'Token application is incorrect')
    }
  }
}



schema.methods.updateLog = function updateLog(ctx, server: boolean = false): boolean {
  let logIp
  let userAgent
  if (server) {
    logIp = require('./application').default.forwardIp(ctx)
    if (!logIp) {
      return false
    }
    userAgent = require('./application').default.forwardUserAgent(ctx, '')
  } else {
    logIp = ctx.ip
    userAgent = ctx.request.header['user-agent'] || ''
  }
  userAgent = userAgent.trim()
  if (this.get('ip') === ip) {
    return false
  }
  let logs = this.get('logs')
  let log = logs.length ? logs[logs.length - 1] : {}
  if (log.ip === ip && (!userAgent || log.userAgent === userAgent) && log.createdAt.getTime() > (Date.now() - 600 * 3600)) {
    return false
  }

  logs.push({ip: logIp, userAgent})


  if (logs.length > 5) {

    // 一个 ip 最多保存5个副本记录
    let count = 0
    for (let i = 5; i < logs.length; i++) {
      if (logs[i].ip === ip) {
        count++
      }
    }

    if (count > 5) {
      for (let i = 5; i < logs.length; i++) {
        if (logs[i].ip === ip) {
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


    let separator = ret.ip.indexOf(':') === -1 ? '.' : ':'
    let retIp = ret.ip.split(separator)
    if (retIp.length <= 4) {
      retIp[retIp.length - 1] = '*'
    } else {
      retIp[retIp.length - 1] = '*'
      retIp[retIp.length - 2] = '*'
    }
    ret.ip = retIp.join(separator)
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


export default model('Token', schema, {
  shardKey: {
    _id: 1,
  },
})
