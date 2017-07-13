import { Schema, Types } from 'mongoose'

import model from './model'

const schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
    required: true,
  },

  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  token: {
    type: Schema.Types.ObjectId,
    ref: 'Token',
    required: true,
  },
  application: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
  },
  path: {
    type: String,
    index: true,
    required: true,
  },
  type: {
    type: String,
    default: 'info',
    enum: ['info', 'error'],
  },
  ip: {
    type: String,
    default: '0.0.0.0',
  },
  userAgent: {
    type: String,
    default: '',
    set(value) {
      return String(value).substr(0, 512)
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})


schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.token;
    delete ret.user;
    if (ret.ip) {
      var separator = ret.ip.indexOf(':') == -1 ? '.' : ':';
      var ip = ret.ip.split(separator);
      if (ip.length <= 4) {
        ip[ip.length -1] = '*';
      } else {
        ip[ip.length -1] = '*';
        ip[ip.length -2] = '*';
      }
      ret.ip = ip.join(separator);
    }
  },
})


schema.methods.can = async function(method) {
  var token = this.getToken()
  var tokenUser = token ? token.get('user') : void 0
  switch (method) {
    case 'list':
      if (!tokenUser || !this.get('user')) {
        return false
      }
      if (!tokenUser.equals(this.get('user')) && (tokenUser.canAttribute('black') || !tokenUser.canAttribute('admin'))) {
        return false
      }
      return await token.can('auth/list')
      break;
    default:
      return false
  }
}

export default model('Log', schema, {strict: false})
