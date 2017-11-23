/* @flow */
import { Schema, Error as MongooseError, type MongoId } from 'mongoose'

import locale from './locale/default'
import createError from './createError'

import { matchIP, hideIP } from './utils'

import model from './model'

import type { Context } from 'koa'


const schema: Schema<TokenModel> = new Schema({
  secret: {
    type: String,
    required: true,
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
      required: true,
      maxlength: 64,
      validate: [
        {
          validator(scope) {
            let value: number = this.get('scopes').length
            if (value <= 32) {
              return true
            }
            this.invalidate('scopes', new MongooseError.ValidatorError({
              path: 'scopes',
              maximum: 32,
              type: 'maximum',
              message: locale.getLanguageValue(['errors', 'maximum']),
              value,
            }))
          },
        },
      ],
    }
  ],

  renewal: {
    type: Schema.Types.Integer,
    min: 0,
    max: 1000 * 86400 * 30 * 6,
    default() {
      if (this.get('type') === 'refresh') {
        return 1000 * 86400 * 30
      }
      if (this.get('client')) {
        return 1000 * 86400 * 30
      }
      return 0
    },
  },

  client: {
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
      let timems: number = 0
      if (this.get('renewal')) {
        timems = this.get('renewal')
      } else if (this.get('type') === 'code') {
        timems = 1000 * 600
      } else if (this.get('type') === 'refresh') {
        timems = 1000 * 86400 * 30
      } else {
        timems = 1000 * 86400 * 1
      }
      date.setTime(date.getTime() + timems)
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
            type: 'match',
            message: locale.getLanguageValue(['errors', 'match']),
            validator(value) {
              return !!matchIP(value)
            },
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
  let logs: Object[] = this.get('logs')
  if (!logs.length) {
    return
  }
  return logs[logs.length - 1].get('userAgent')
})

schema.virtual('ip').get(function () {
  let logs: Object[] = this.get('logs')
  if (!logs.length) {
    return '0.0.0.0'
  }
  return logs[logs.length - 1].get('ip')
})

schema.virtual('expires_in').get(function () {
  let time: number = this.get('expiredAt') - Date.now()
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
  token?: TokenModel,
  {
    path: optPath = '/',
    admin: optAdmin = false,
    client: optClient = true,
    application: optApplication = true,
  }: {
    path: string,
    admin: boolean,
    client: boolean,
    application: boolean,
  } = {
  }
) {
  if (token && !this.equals(token)) {
    throw createError(500, 'incorrect', { path: 'token', value: token.get('id') })
  }

  let path: string = optPath
  if (!path || path.charAt(0) === '/' || path.indexOf('\\') !== -1 || path.indexOf('//') !== -1) {
    throw createError(403, 'incorrect', { path: 'path', value: path })
  }

  path = path.replace(/\*\*/g, '*/*')
  let scopes: string[] = this.get('scopes')
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
    throw createError(400, 'match', { path: 'scope', value: path })
  }

  if (optClient && this.get('client')) {
    // client
  } else if (optApplication && this.get('application')) {
    await this.get('application').canScope(this, { path: optPath })
  }

  if (optAdmin) {
    await this.canScope(this, { path: 'admin', client: optClient, application: optApplication })
  }
}

schema.methods.canUser = async function canUser(
  token?: TokenModel,
  {
    value,
    admin = false,
    black = admin,
  }: {
    value: boolean | UserModel | MongoId | string,
    admin: boolean,
    black: boolean,
  } = {
  }
) {

  if (token && !this.equals(token)) {
    throw createError(500, 'incorrect', { path: 'token', value: token.get('id') })
  }

  let user: ?UserModel = this.get('user')
  if (!user) {
    if (admin || black || value) {
      throw createError(401, 'notlogged')
    } else {
      return
    }
  }

  if (value === undefined || value === null) {
    // empty
  } else if (typeof value !== 'boolean') {
    // $flow-disable-line
    if (!user.equals(value)) {
      throw createError(403, 'incorrect', { path: 'user', value: typeof value.get === 'function' ? value.get('id') : String(value) })
    }
  } else {
    if (user) {
      throw createError(403, 'haslogged')
    }
  }

  if (admin) {
    await user.canHasAdmin(this)
  }

  if (black) {
    await user.canNotBlack(this)
  }
}


schema.methods.canApplication = async function canApplication(token?: TokenModel, { value }: { value: boolean | MongoId | ApplicationModel }) {
  if (token && !this.equals(token)) {
    throw createError(500, 'incorrect', { path: 'token', value: token.get('id') })
  }
  let application: ?ApplicationModel = this.get('application')
  if (typeof value === 'boolean') {
    if (Boolean(application) !== value) {
      if (!application) {
        throw createError(400, 'required', { path: 'application' })
      } else {
        throw createError(400, 'incorrect', { path: 'application', value: application.get('id') })
      }
    }
  } else {
    if (!application) {
      throw createError(400, 'required', { path: 'application' })
    }
    if (!application.equals(value)) {
      throw createError(400, 'incorrect', { path: 'application', value: application.get('id') })
    }
  }
}




schema.methods.canList = async function canList(token?: TokenModel, { deletedAt = false }: { deletedAt: boolean } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })
  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('user')) || this.get('deletedAt') || deletedAt

  await token.canScope(token, { path: 'token/list', admin })
  await token.canUser(token, { value: true, admin })
}


schema.methods.canRead = async function canRead(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  if (!token.equals(this)) {
    await token.canUser(token, { value: true })

    let user: UserModel = token.get('user')
    let admin: boolean = !user.equals(this.get('user')) || this.get('deletedAt')
    await token.canScope(token, { path: 'token/read', admin })
    await token.canUser(token, { value: true, admin })
  }
}

schema.methods.canSave = async function canSave(token?: TokenModel) {
  if (this.isNew) {
    return
  }

  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  if (!token.equals(this)) {
    await token.canUser(token, { value: true })
    let user: UserModel = token.get('user')
    let admin: boolean = !user.equals(this.get('user'))
    await token.canScope(token, { path: 'token/save', admin })
    await token.canUser(token, { value: true, black: true, admin })
  }
  await this.canNotDelete(token)
}

schema.methods.canDelete = async function canDelete(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  if (!token.equals(this)) {
    await token.canUser(token, { value: true })
    let user: UserModel = token.get('user')
    let admin: boolean = !user.equals(this.get('user'))
    await token.canScope(token, { path: 'token/delete', admin })
    await token.canUser(token, { value: true, black: true, admin })
  }
  await this.canNotDelete(token)
}



schema.methods.canNotDelete = async function canNotDelete(token?: TokenModel) {
  if (this.get('deletedAt')) {
    throw createError(404, 'notexist', { path: 'token' })
  }
}


schema.methods.updateLog = function updateLog(ctx: Context, server: boolean = false): boolean {
  let ip
  let userAgent: string
  if (server) {
    ip = require('./application').default.forwardIp(ctx)
    if (!ip) {
      return false
    }
    userAgent = require('./application').default.forwardUserAgent(ctx, '')
  } else {
    ip = ctx.ip
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

  logs.push({ ip, userAgent })


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
  transform(doc: TokenModel, ret) {
    delete ret.secret
    delete ret.parent
    delete ret.state
    delete ret.logs

    ret.ip = hideIP(ret.ip)
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


export default (model('Token', schema, {
  shardKey: {
    _id: 1,
  },
}): Class<TokenModel>)
