import {Schema, Types} from 'mongoose'

import ip from 'ip'

import reserve from 'config/reserve'

import model from './model'



// 应用
const schema = new Schema({

  // 密码
  secret: {
    type: String,
    required: true,
    default() {
      return Application.createRandom(32)
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
    validate: [
      {
        validator: reserve,
        message: '"{VALUE}" is reserved by the system ({PATH})',
      },
      {
        validator(slug) {
          try {
            new Types.ObjectId(slug)
          } catch (e) {
            return true
          }
          return false
        },
        message: 'Slug can not be ID ({PATH})',
      },
      {
        async validator(slug, cb) {
          if (this.get('deletedAt')) {
            cb(true);
            return;
          }
          var application = await Application.findOne({slug}).read('primary').exec();
          cb(!application || this.equals(application))
        },
        message: 'Slug already exists ({PATH})',
      },
    ]
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


  // 已获取的权限
  scopes: [
    {
      type: String,
      index: true,
      required: [true, 'Scope name can not be empty ({PATH})'],
      maxlength: [64, 'Scope name can not be longer than 64 bytes ({PATH})'],
      validate: [
        {
          validator(scope) {
            return this.get('scopes').length <= 32;
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
      maxlength: [255, '请求源长度不能大于 64 字节 ({PATH})'],
      trim: true,
      validate: [
        {
          validator(requestOrigin) {
            var requestOrigins = this.get('requestOrigins')
            return requestOrigins.length <= 16;
          },
          message: '请求源数量不能大于 16 个 ({PATH})',
        },
        {
          validator(requestOrigin) {
            var matches = requestOrigin.match(/^(\w+)\:\/+[0-9a-z]/)
            if (!matches) {
              return false
            }
            var protocol = matches[1].toLocaleLowerCase()
            return protocol.indexOf('java') == -1 && protocol.indexOf('mail') == -1 && protocol.indexOf('file') == -1 && protocol.indexOf('ftp') == -1 && protocol.indexOf('data') == -1
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
            var redirectUris = this.get('redirectUris')
            return redirectUris.length <= 16;
          },
          message: '重定向地址数量不能大于 16 个 ({PATH})',
        },
        {
          validator(redirectUri) {
            var matches = redirectUri.match(/^(\w+)\:\/+[0-9a-z]/)
            if (!matches) {
              return false
            }
            var protocol = matches[1].toLocaleLowerCase()
            return protocol.indexOf('java') == -1 && protocol.indexOf('mail') == -1 && protocol.indexOf('file') == -1 && protocol.indexOf('ftp') == -1 && protocol.indexOf('data') == -1
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
            var index = allowedIp.indexOf('/')
            if (index == -1) {
              return ip.isV4Format(allowedIp) || ip.isV6Format(allowedIp)
            }
            var value = allowedIp.substr(0, index)

            if (!ip.isV4Format(value) && !ip.isV6Format(value)) {
              return false
            }

            var cidr = parseInt(allowedIp.substr(index))
            var maxCidr = value.indexOf(':') == -1 ? 32 : 128
            return cidr <= maxCidr && cidr >= 1
          },
          message: '允许 IP 段 "{VALUE}" 格式不正确 ({PATH})',
        },
        {
          validator(allowedIp) {
            var allowedIps = this.get('allowedIps')
            return allowedIps.length <= 32;
          },
          message: '允许 IP 段数量不能大于 32 个 ({PATH})',
        },
      ],
    }
  ],

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
});




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

schema.methods.can = async function(method) {
  var token = this.getToken()
  switch (method) {
    case 'read':
      if (this.get('deletedAt') || this.get('status') == 'block') {
        return false
      }
      if (!await token.can('application/read')) {
        return false
      }
      if (this.get('status') != 'release') {
        if (!token.get('user')) {
          return false
        }
        return token.get('user').equals(this.get('creator'))
      }
      return true
      break;
    case 'save':

      break;
    case 'delete':

      break;
    default:
      return false
  }
}

schema.methods.allowedIp = function(value) {
  var allowedIps = this.get('allowedIps')
  if (allowedIps.length == 0) {
    return true
  }
  var allowedIp
  for (var i = 0; i < allowedIps.length; i++) {
    allowedIp = allowedIps[i]
    if (allowedIp.indexOf('/') == -1) {
      return ip.isEqual(value)
    } else if (ip.cidrSubnet(allowedIp).contains(value)) {
      return true
    }
  }
  return false
}
schema.statics.forwardIp = function(ctx, def) {
  var value = ctx.query.ip || ctx.query.x_ip
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

schema.statics.forwardUserAgent = function(ctx, def) {
  userAgent = ctx.query.user_agent || ctx.query.x_user_agent
  if (ctx.request.header['x-user-agent']) {
    userAgent = ctx.request.header['x-user-agent']
  } else if (ctx.request.body instanceof Object && ctx.request.body.user_agent) {
    userAgent = ctx.request.body.user_agent
  } else if (ctx.request.body.fields instanceof Object && ctx.request.body.fields.user_agent) {
    userAgent = ctx.request.body.fields.user_agent
  } else if (!userAgent) {
    userAgent = def
  }
  return userAgent
}


schema.statics.createRandom = function(length, lower) {
  const string = lower ? '0123456789abcdefghijklmnopqrstuvwxyz' : '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

  var secret = ''
  for (var i = 0; i < length; i++) {
    secret += string.substr(Math.round(Math.random() * (string.length-1)), 1)
  }
  return secret
}





schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.secret
  },
});



const Application = model('Application', schema);
export default Application
