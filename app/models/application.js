/* @flow */
import { Schema, Types, Error as MongooseError  } from 'mongoose'

import reserve from 'config/reserve'

import  { matchIP, matchCidrIP } from './utils'

import locale from './locale/default'

import createError from './createError'

import model from './model'

import type { Context } from 'koa'

// 应用
const schema: Schema<ApplicationModel> = new Schema({

  // 密码
  secret: {
    type: String,
    required: true,
    default() {
      return this.constructor.createRandom(32)
    },
  },

  // 状态
  status: {
    type: String,
    default: 'pending',
    index: true,
    enum: ['pending', 'approved', 'rejected', 'banned'],
    required: true,
  },

  // 名称
  name: {
    type: String,
    required: true,
    maxlength: 32,
  },

  // slug
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    required: true,
    minlength: 3,
    maxlength: 32,
    match: /^([0-9a-z]+\-)*[0-9a-z]+$/i,
    default() {
      return this.constructor.createRandom(32)
    },
    validate: [
      {
        type: 'not_id',
        message: locale.getLanguagePackValue(['errors', 'notid']),
        validator(slug) {
          try {
            // eslint-disable-next-line
            new Types.ObjectId(slug)
          } catch (e) {
            return true
          }
          return true
        },
      },
      {
        type: 'reserve',
        message: locale.getLanguagePackValue(['errors', 'reserve']),
        validator: reserve,
      },
      {
        isAsync: true,
        type: 'hasexist',
        message: locale.getLanguagePackValue(['errors', 'hasexist']),
        async validator(slug) {
          if (this.get('deletedAt')) {
            return true
          }
          let application: ?ApplicationModel = await this.constructor.findOne({ slug }).read('primary').exec()
          return !application || this.equals(application)
        },
      },
    ],
  },


  // 描述
  content: {
    type: String,
    maxlength: 255,
  },

  // 认证模式
  auths: {

    // 简化
    implicit: {
      type: Boolean,
      default: false,
    },

    // 密码
    password: {
      type: Boolean,
      default: false,
    },

    // 跨域
    cors: {
      type: Boolean,
      default: false,
    },
  },


  // 已开启的权限
  scopes: [
    {
      type: String,
      required: true,
      maxlength: 64,
      validate: [
        {
          validator(scope) {
            let value = this.get('scopes').length
            if (value <= 32) {
              return true
            }
            this.invalidate('scopes', new MongooseError.ValidatorError({
              path: 'scopes',
              maximum: 32,
              type: 'maximum',
              message: locale.getLanguagePackValue(['errors', 'maximum']),
              value,
            }))
          },
        },
      ],
    }
  ],

  homeUrl: {
    type: String,
    maxlength: 255,
    match: /^(https?:)?\/\/\w+/,
  },


  logoUrl: {
    type: String,
    maxlength: 255,
    match: /^(https?:)?\/\/\w+/,
  },

  pushUrl: {
    type: String,
    maxlength: 255,
    match: /^(https?:)?\/\/\w+/,
  },


  // 请求源
  requestOrigins: [
    {
      type: String,
      trim: true,
      required: true,
      maxlength: 64,
      validate: [
        {
          validator(requestOrigin) {
            let value = this.get('requestOrigins').length
            if (value <= 8) {
              return true
            }
            this.invalidate('requestOrigins', new MongooseError.ValidatorError({
              path: 'requestOrigins',
              maximum: 8,
              type: 'maximum',
              message: locale.getLanguagePackValue(['errors', 'maximum']),
              value,
            }))
          },
        },
        {
          type: 'match',
          message: locale.getLanguagePackValue(['errors', 'match']),
          validator(requestOrigin) {
            let matches = requestOrigin.match(/^(\w+)\:\/+[0-9a-z]/)
            if (!matches) {
              return false
            }
            let protocol = matches[1].toLocaleLowerCase()
            return protocol.indexOf('java') === -1 && protocol.indexOf('mail') === -1 && protocol.indexOf('file') === -1 && protocol.indexOf('ftp') === -1 && protocol.indexOf('data') === -1
          },
        },
      ],
    }
  ],

  // 重定向 地址
  redirectUris: [
    {
      type: String,
      trim: true,
      required: true,
      maxlength: 255,
      validate: [
        {
          validator(redirectUri) {
            let value = this.get('redirectUris').length
            if (value <= 8) {
              return true
            }
            this.invalidate('redirectUris', new MongooseError.ValidatorError({
              path: 'redirectUris',
              maximum: 8,
              type: 'maximum',
              message: locale.getLanguagePackValue(['errors', 'maximum']),
              value,
            }))
          },
        },
        {
          type: 'match',
          message: locale.getLanguagePackValue(['errors', 'match']),
          validator(redirectUri) {
            let matches = redirectUri.match(/^(\w+)\:\/+[0-9a-z]/)
            if (!matches) {
              return false
            }
            let protocol = matches[1].toLocaleLowerCase()
            return protocol.indexOf('java') === -1 && protocol.indexOf('mail') === -1 && protocol.indexOf('file') === -1 && protocol.indexOf('ftp') === -1 && protocol.indexOf('data') === -1
          },
        },
      ],
    }
  ],


  // 允许 IP
  allowedIps: [
    {
      trim: true,
      lowercase: true,
      type: String,
      required: true,
      maxlength: 64,
      validate: [
        {
          type: 'match',
          validator(allowedIp) {
            let index = allowedIp.indexOf('/')
            if (index === -1) {
              return matchIP(allowedIp) || matchCidrIP(allowedIp)
            }
          },
          message: locale.getLanguagePackValue(['errors', 'match']),
        },
        {
          validator(allowedIp) {
            let value = this.get('allowedIps').length
            if (value <= 32) {
              return true
            }

            this.invalidate('allowedIps', new MongooseError.ValidatorError({
              path: 'allowedIps',
              maximum: 32,
              type: 'maximum',
              message: locale.getLanguagePackValue(['errors', 'maximum']),
              value,
            }))

          },
        },
      ],
    }
  ],

  reason: {
    type: String,
    trim: true,
    maxlength: 255,
  },

  creator: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
    required: true,
  },

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



schema.methods.canScope = async function canScope(token?: TokenModel, { path: optPath = '/' }: { path: string } = {}) {
  let path: string = optPath
  if (!path || path.charAt(0) === '/' || path.indexOf('\\') !== -1 || path.indexOf('//') !== -1) {
    throw createError(403, 'incorrect', { path: 'scope', value: path })
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
    throw createError(400, 'match', { path: 'scope', value: path })
  }
}


schema.methods.canNotDelete = async function canNotDelete(token?: TokenModel) {
  if (this.get('deletedAt')) {
    throw createError(404, 'notexist', { path: 'application' })
  }
}

schema.methods.canList = async function canList(token?: TokenModel, { deletedAt = false, status = '' }: { deletedAt: boolean, status: string } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('creator')) || this.get('deletedAt') || deletedAt
  await token.canScope(token, { path: 'application/list', admin })
  await token.canUser(token, { value: true, admin })
}


schema.methods.canRead = async function canRead(token?: TokenModel) {
  if (!this.get('deletedAt')) {
    return
  }

  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  await token.canUser(token, { value: true })

  let user: UserModel = token.get('user')

  // 已删除 并且不是管理员
  if (this.get('deletedAt') && (user.get('black') || !user.get('admin'))) {
    await this.canNotDelete(token)
  }

  let admin: boolean = !user.equals(this.get('creator')) || this.get('deletedAt')

  // token 的 application 不是和 application 相同需要
  if (!this.equals(token.get('application')) || admin) {
    await token.canScope(token, { path: 'application/read', admin })
  }

  await token.canUser(token, { value: true, admin })
}

schema.methods.canSave = async function canSave(token?: TokenModel, {
  auths = {},
  scope,
}: {
  auths: {
    password?: boolean,
    implicit?: boolean,
    cors?: boolean
  },
  scope?: string,
} = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }

  await token.canUser(token, { value: true })
  await this.canNotDelete(token)

  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('creator'))

  if ((this.isMounted('auths.password') && this.get('auths').password) || (auths.password && !this.get('auths').password)) {
    admin = true
  }

  if ((this.isMounted('auths.implicit') && this.get('auths').implicit) || (auths.implicit && !this.get('auths').implicit)) {
    admin = true
  }

  if ((this.isMounted('auths.cors') && this.get('auths').cors) || (auths.cors && !this.get('auths').cors)) {
    admin = true
  }

  if (!admin && scope !== undefined) {
    if (!this.isModified('scopes')) {
      try {
        await this.canScope(token, { path: scope })
      } catch (e) {
        admin = true
      }
    } else {
      admin = true
    }
  }
  await token.canScope(token, { path: 'application/save', admin })
  await token.canUser(token, { value: true, admin, black: true })
}


schema.methods.canStatus = async function canStatus(token?: TokenModel) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canScope(token, { path: 'application/status', admin: true })
  await token.canUser(token, { value: true, admin: true })
}

schema.methods.canDelete = async function canDelete(token?: TokenModel, { value }: { value?: boolean } = {}) {
  if (!token) {
    throw createError(400, 'required', { path: 'token' })
  }
  await token.canUser(token, { value: true })
  let user: UserModel = token.get('user')
  let admin: boolean = !user.equals(this.get('creator')) || !value

  await token.canScope(token, { path: 'application/delete', admin })
  await token.canUser(token, { user: true, admin: true })


  if (value) {
    await this.canNotDelete(token)
  } else if (value !== undefined && !this.get('deletedAt')) {
    throw createError(403, 'hasexist', { path: 'application' })
  }
}


schema.methods.canAllowedIp = function canAllowedIp(token?: TokenModel, { ip: optIp }: { ip?: string } = {}) {
  let allowedIps: string[] = this.get('allowedIps')
  if (allowedIps.length === 0) {
    return
  }

  let value = optIp
  if (!value) {
    if (!token) {
      throw createError(400, 'required', { path: 'token' })
    }
    value = token.get('ip')
  }

  if (!value) {
    return
  }


  for (let i = 0; i < allowedIps.length; i++) {
    if (matchIP(value, allowedIps[i])) {
      return
    }
  }
  throw createError(403, 'white', { path: 'ip', code: 'unauthorized_client' })
}



schema.statics.forwardIp = function forwardIp <T>(ctx: Context, def?: T): T | string {
  let value = ctx.query.ip || ctx.query.x_ip
  if (ctx.request.header['x-ip']) {
    value = ctx.request.header['x-ip']
  } else if (ctx.request.body instanceof Object && ctx.request.body.ip) {
    value = ctx.request.body.ip
  } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.ip) {
    value = ctx.request.body.fields.ip
  }
  if (!value || !matchIP(value)) {
    value = def
  }
  // $flow-disable-line
  return value
}

schema.statics.forwardUserAgent = function forwardUserAgent <T>(ctx: Context, def?: T): T | string {
  let userAgent = ctx.query.user_agent || ctx.query.x_user_agent
  if (ctx.request.header['x-user-agent']) {
    userAgent = ctx.request.header['x-user-agent']
  } else if (ctx.request.body instanceof Object && ctx.request.body.user_agent) {
    userAgent = ctx.request.body.user_agent
  } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.user_agent) {
    userAgent = ctx.request.body.fields.user_agent
  } else if (userAgent) {
    userAgent = def
  }
  if (userAgent === def) {
    // $flow-disable-line
    return userAgent
  }
  return String(userAgent)
}


schema.statics.createRandom = function createRandom(length: number = 32, lower: boolean = false): string {
  const string = lower ? '0123456789abcdefghijklmnopqrstuvwxyz' : '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

  let secret = ''
  for (let i = 0; i < length; i++) {
    secret += string.substr(Math.round(Math.random() * (string.length - 1)), 1)
  }
  return secret
}




schema.set('toJSON', {
  virtuals: true,
  transform(doc: ApplicationModel, ret) {
    let token = doc.getToken()
    let user = token ? token.get('user') : undefined
    let me = user && user.equals(doc.get('creator'))
    let admin = user && user.get('admin') && !user.get('black')

    if (!me && !admin) {
      delete ret.secret
      delete ret.auths
      delete ret.pushUrl
      delete ret.allowedIps
      if (ret.status === 'rejected' || ret.status === 'banned') {
        ret.content = ''
        ret.name = '***'
        ret.logoUrl = ''
        ret.homeUrl = ''
      }
    }
  },
})



export default (model('Application', schema): Class<ApplicationModel>)
