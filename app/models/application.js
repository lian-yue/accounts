/* @flow */
import {Schema, Types} from 'mongoose'

import ip from 'ip'

import reserve from 'config/reserve'

import model from './model'

import Token from './token'

// 应用
const schema = new Schema({

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
    enum: ['pending', 'release', 'block'],
    required: true,
  },

  // 名称
  name: {
    type: String,
    required: [true, 'Application name can not be empty ({PATH})'],
    maxlength: [32, 'Application name can not be greater than 32 bytes ({PATH})'],
  },

  // slug
  slug: {
    type: String,
    unique: true,
    trim: true,
    lowercase: true,
    required: [true, 'Slug can not be empty ({PATH})'],
    minlength: [3, 'Slug can not be less than 3 bytes ({PATH})'],
    maxlength: [32, 'Slug can not be greater than 32 bytes ({PATH})'],
    match: [/^[0-9a-z_-]+$/, 'Slug only allows the use of English, numbers and _- ({PATH})'],
    default() {
      return this.constructor.createRandom(32)
    },
    validate: [
      {
        validator: reserve,
        message: '"{VALUE}" is reserved by the system ({PATH})',
      },
      {
        validator(slug) {
          try {
            /* eslint-disable */
            new Types.ObjectId(slug)
            /* eslint-enable */
          } catch (e) {
            return true
          }
          return false
        },
        message: 'Slug can not be ID ({PATH})',
      },
      {
        isAsync: true,
        async validator(slug) {
          if (this.get('deletedAt')) {
            return true
          }
          let application = await this.constructor.findOne({slug}).read('primary').exec()
          return !application || this.equals(application)
        },
        message: 'Slug already exists ({PATH})',
      },
    ],
  },


  // 描述
  content: {
    type: String,
    maxlength: [255, 'Description length is greater than 255 bytes can not be ({PATH})'],
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
      required: [true, 'Scope name can not be empty ({PATH})'],
      maxlength: [64, 'Scope name can not be longer than 64 bytes ({PATH})'],
      validate: [
        {
          validator(scope) {
            return this.get('scopes').length <= 32
          },
          message: '权限数量不能大于 32 个 ({PATH})',
        },
        {
          validator(scope) {
            return true
          },
          message: '"{VALUE}" 权限格式不正确 ({PATH})',
        },
      ],
    }
  ],

  homeUrl: {
    type: String,
    maxlength: [255, '首页 URL 长度不能大于 255 字节 ({PATH})'],
    match: [/^(https?:)?\/\/\w+/, '首页 URL 不正确 ({PATH})'],
  },

  logoUrl: {
    type: String,
    maxlength: [255, 'Logo URL 长度不能大于 255 字节 ({PATH})'],
    match: [/^(https?:)?\/\/\w+/, 'Logo URL 不正确 ({PATH})'],
  },

  pushUrl: {
    type: String,
    maxlength: [255, '主动推送 URL 长度不能大于 255 字节 ({PATH})'],
    match: [/^https?:?\/\/\w+/, '推送地址 URL 不正确 ({PATH})'],
  },

  // 请求源
  requestOrigins: [
    {
      type: String,
      required: [true, '请求源不能为空 ({PATH})'],
      maxlength: [64, '请求源长度不能大于 64 字节 ({PATH})'],
      trim: true,
      validate: [
        {
          validator(requestOrigin) {
            return this.get('requestOrigins').length <= 8
          },
          message: '请求源数量不能大于 8 个 ({PATH})',
        },
        {
          validator(requestOrigin) {
            let matches = requestOrigin.match(/^(\w+)\:\/+[0-9a-z]/)
            if (!matches) {
              return false
            }
            let protocol = matches[1].toLocaleLowerCase()
            return protocol.indexOf('java') === -1 && protocol.indexOf('mail') === -1 && protocol.indexOf('file') === -1 && protocol.indexOf('ftp') === -1 && protocol.indexOf('data') === -1
          },
          message: '"{VALUE}" 不是 URL 地址 ({PATH})',
        },
      ],
    }
  ],

  // 重定向 地址
  redirectUris: [
    {
      type: String,
      required: [true, '重定向地址不能为空 ({PATH})'],
      maxlength: [255, '重定向地址长度不能大于 255 字节 ({PATH})'],
      validate: [
        {
          validator(redirectUri) {
            return this.get('redirectUris').length <= 8
          },
          message: '重定向地址数量不能大于 8 个 ({PATH})',
        },
        {
          validator(redirectUri) {
            let matches = redirectUri.match(/^(\w+)\:\/+[0-9a-z]/)
            if (!matches) {
              return false
            }
            let protocol = matches[1].toLocaleLowerCase()
            return protocol.indexOf('java') === -1 && protocol.indexOf('mail') === -1 && protocol.indexOf('file') === -1 && protocol.indexOf('ftp') === -1 && protocol.indexOf('data') === -1
          },
          message: '"{VALUE}" 不是 URL 地址 ({PATH})',
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
      required: [true, '允许 IP 段不能为空 ({PATH})'],
      maxlength: [64, '允许 IP 段长度不能大于 64 字节 ({PATH})'],
      validate: [
        {
          validator(allowedIp) {
            let index = allowedIp.indexOf('/')
            if (index === -1) {
              return ip.isV4Format(allowedIp) || ip.isV6Format(allowedIp)
            }
            let value = allowedIp.substr(0, index)

            if (!ip.isV4Format(value) && !ip.isV6Format(value)) {
              return false
            }

            let cidr = parseInt(allowedIp.substr(index), 10)
            let maxCidr = value.indexOf(':') === -1 ? 32 : 128
            return cidr <= maxCidr && cidr >= 1
          },
          message: '允许 IP 段 "{VALUE}" 格式不正确 ({PATH})',
        },
        {
          validator(allowedIp) {
            return this.get('allowedIps').length <= 32
          },
          message: '允许 IP 段数量不能大于 32 个 ({PATH})',
        },
      ],
    }
  ],

  reason: {
    type: String,
    trim: true,
    maxlength: [255, '理由不能大于 255 字节 ({PATH})'],
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



schema.methods.canScope = async function canScope(token?: Token, {path: optPath, client}: {path: string | string[], client: boolean} = {path: '/', client: true}) {
  let path: string | string[] = optPath
  if (path instanceof Array) {
    path = path.join('/')
  }
  if (!path || path.charAt(0) === '/' || path.indexOf('\\') !== -1 || path.indexOf('//') !== -1) {
    this.throw(500, '`path` is incorrect')
  }

  if (client && token && token.get('user') && token.get('user').equals(this.get('creator')) && token.get('scopes').length === 1 && token.get('scopes')[0] === '**') {
    return
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
}


schema.methods.canNotDelete = async function canNotDelete(token?: Token) {
  if (this.get('deletedAt')) {
    this.throw(404, 'Application does not exist')
  }
}


schema.methods.canNotBlock = async function canNotBlock(token?: Token) {
  if (this.get('status') === 'block') {
    this.throw(403, 'The application is blacklisted')
  }
}

schema.methods.canList = async function canList(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'application/list'})

  let tokenUser = token.get('user')

  if (!tokenUser.equals(this.get('creator')) || this.get('deletedAt')) {
    await token.canScope(token, {path: 'admin'})
    await tokenUser.canNotBlock(token)
    await tokenUser.canHasAdmin(token)
  }
}


schema.methods.canRead = async function canRead(token?: Token) {
  // 正常状态 所有人可读
  if (!this.get('deletedAt') && this.get('status') !== 'block') {
    return
  }
  if (!token) {
    return this.throwTokenNotExists()
  }

  // token 的 application 不是和 application 相同需要
  if (!this.equals(token.get('application'))) {
    await token.canScope(token, {path: 'application/read'})
  }
  await token.canUser(token, {value: true})

  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('creator'))) {
    await token.canScope(token, {path: 'admin'})
  }

  if (!tokenUser.get('admin')) {
    await this.canNotDelete()
  }

  if (!tokenUser.equals(this.get('creator'))) {
    await tokenUser.canNotBlock(token)
    await tokenUser.canHasAdmin(token)
  }
}

schema.methods.canSave = async function canSave(token?: Token, {
  auths,
  scope
}: {
  auths: {
    password?: boolean,
    implicit?: boolean,
    cors?: boolean
  },
  scope?: string | string[],
}) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'application/save'})
  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('creator'))) {
    await token.canScope(token, {path: 'admin'})
  }

  if ((this.isMounted('auths.password') && this.get('auths').password) || (auths.password && !this.get('auths').password)) {
    await tokenUser.canHasAdmin(token)
  }

  if ((this.isMounted('auths.implicit') && this.get('auths').implicit) || (auths.implicit && !this.get('auths').implicit)) {
    await tokenUser.canHasAdmin(token)
  }

  if ((this.isMounted('auths.cors') && this.get('auths').cors) || (auths.cors && !this.get('auths').cors)) {
    await tokenUser.canHasAdmin(token)
  }

  if (scope !== undefined) {
    try {
      await this.canScope(token, {path: scope, client: false})
    } catch (e) {
      await tokenUser.canHasAdmin(token)
    }
  }

  await tokenUser.canNotBlock(token)
  if (!tokenUser.equals(this.get('creator')) || this.get('deletedAt') || this.get('status') === 'block') {
    await tokenUser.canHasAdmin(token)
  }
}


schema.methods.canStatus = async function canStatus(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'application/status'})
  await token.canScope(token, {path: 'admin'})
  let tokenUser = token.get('user')
  await tokenUser.canNotBlock(token)
  await tokenUser.canHasAdmin(token)
}

schema.methods.canDelete = async function canDelete(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'application/delete'})
  let tokenUser = token.get('user')
  if (!tokenUser.equals(this.get('creator'))) {
    await token.canScope(token, {path: 'admin'})
  }
  await this.canNotDelete(token)

  await tokenUser.canNotBlock(token)
  if (!tokenUser.equals(this.get('creator'))) {
    await tokenUser.canHasAdmin(token)
  }
}

schema.methods.canRestore = async function canRestore(token?: Token) {
  if (!token) {
    return this.throwTokenNotExists()
  }
  await token.canUser(token, {value: true})
  await token.canScope(token, {path: 'application/delete'})
  await token.canScope(token, {path: 'admin'})
  let tokenUser = token.get('user')
  await tokenUser.canNotBlock(token)
  await tokenUser.canHasAdmin(token)
  if (!this.get('deletedAt')) {
    this.throw(403, 'The application has not been deleted')
  }
}


schema.methods.allowedIp = function allowedIp(value: string): boolean {
  let allowedIps = this.get('allowedIps')
  if (allowedIps.length === 0) {
    return true
  }
  for (let i = 0; i < allowedIps.length; i++) {
    let value1 = allowedIps[i]
    if (value1.indexOf('/') === -1) {
      return ip.isEqual(value)
    } else if (ip.cidrSubnet(value1).contains(value)) {
      return true
    }
  }
  return false
}



schema.statics.forwardIp = function forwardIp(ctx: Object, def?: string): void | string {
  let value = ctx.query.ip || ctx.query.x_ip
  if (ctx.request.header['x-ip']) {
    value = ctx.request.header['x-ip']
  } else if (ctx.request.body instanceof Object && ctx.request.body.ip) {
    value = ctx.request.body.ip
  } else if (ctx.request.body instanceof Object && ctx.request.body.fields instanceof Object && ctx.request.body.fields.ip) {
    value = ctx.request.body.fields.ip
  }
  if (!value || (!ip.isV4Format(value) && !ip.isV6Format(value))) {
    value = def
  }
  return value
}

schema.statics.forwardUserAgent = function forwardUserAgent(ctx: Object, def?: string): void | string {
  let userAgent = ctx.query.user_agent || ctx.query.x_user_agent
  if (ctx.request.header['x-user-agent']) {
    userAgent = ctx.request.header['x-user-agent']
  } else if (ctx.request.body instanceof Object && ctx.request.body.user_agent) {
    userAgent = ctx.request.body.user_agent
  } else if (ctx.request.body.fields instanceof Object && ctx.request.body.fields.user_agent) {
    userAgent = ctx.request.body.fields.user_agent
  } else if (userAgent) {
    userAgent = def
  }
  if (userAgent === undefined) {
    return undefined
  }
  return String(userAgent)
}


schema.statics.createRandom = function createRandom(length: number = 32, lower: boolean = false) {
  const string = lower ? '0123456789abcdefghijklmnopqrstuvwxyz' : '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

  let secret = ''
  for (let i = 0; i < length; i++) {
    secret += string.substr(Math.round(Math.random() * (string.length - 1)), 1)
  }
  return secret
}




schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    let tokenUser = doc.getToken() ? doc.getToken().get('user') : undefined
    if (!tokenUser || (!tokenUser.get('admin') && !tokenUser.equals(doc.get('creator')))) {
      delete ret.secret
      delete ret.reason
      delete ret.auths
      delete ret.pushUrl
      delete ret.allowedIps
    }
  },
})



export default model('Application', schema)
