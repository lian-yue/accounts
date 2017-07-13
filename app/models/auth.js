import {Schema, Types} from 'mongoose'
import model from './model'
import * as validator from './validator'



const schema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'User',
    required: true,
  },
  column: {
    type: String,
    required: true,
    index: true,
  },
  value: {
    type: String,
    index: true,
    lowercase: true,
    trim: true,
    index: true,
    validate: [
      {
        validator(value) {
          if (this.get('column') != 'email') {
            return true;
          }
          return !!value;
        },
        message: '电子邮箱不能为空',
      },
      {
        validator(value) {
          if (this.get('column') != 'email') {
            return true;
          }
          value = validator.email(value);
          if (!value) {
            return false;
          }
          this.set('value', value);
          return true;
        },
        message: '电子邮箱格式不正确',
      },
      {
        async validator(value, cb) {
          if (this.get('column') != 'email' || this.get('deletedAt')) {
            cb(true);
            return;
          }
          var exists = await Auth.findOne({column:'email', value, deletedAt:{$exists:false}}).read('primary').exec();
          cb(!exists || this.equals(exists))
        },
        message: '电子邮箱已存在 "{VALUE}"',
      },
      {
        async validator(value, cb) {
          if (this.get('column') != 'email' || this.get('deletedAt') || !this.isNew) {
            cb(true);
            return;
          }
          var results = await Auth.find({user:this.get('user'), column: this.get('column'), deletedAt: {$exists: false}}).exec()
          cb(results.length < 3);
        },
        message: '最多只能绑定 3 个电子邮箱',
      },
      {
        validator(value) {
          if (this.get('column') != 'phone') {
            return true;
          }
          return !!value;
        },
        message: '手机号不能为空',
      },
      {
        validator(value) {
          if (this.get('column') != 'phone') {
            return true;
          }
          value = validator.mobilePhone(value);
          if (!value) {
            return false;
          }
          this.set('value', value);
          return true;
        },
        message: '手机号格式不正确',
      },
      {
        async validator(value, cb) {
          if (this.get('column') != 'phone' || this.get('deletedAt')) {
            cb(true);
            return;
          }
          var exists = await Auth.findOne({column:'phone', value, deletedAt:{$exists:false}}).read('primary').exec();
          cb(!exists || this.equals(exists))
        },
        message: '手机号已存在 "{VALUE}"',
      },
      {
        async validator(value, cb) {
          if (this.get('column') != 'phone' || this.get('deletedAt') || !this.isNew) {
            cb(true);
            return;
          }
          var results = await Auth.find({user:this.get('user'), column: this.get('column'), deletedAt: {$exists: false}}).exec()
          cb(results.length < 3);
        },
        message: '最多只能绑定 3 个手机号',
      },
      {
        validator(value) {
          return !!value;
        },
        message: '绑定信息不能为空',
      },
      {
        async validator(value, cb) {
          if (['phone', 'email'].indexOf(this.get('column')) != -1 || this.get('deletedAt')) {
            cb(true);
            return;
          }
          var exists = await Auth.findOne({column:this.get('column'), value, deletedAt:{$exists:false}}).read('primary').exec();
          cb(!exists || this.equals(exists))
        },
        message: '该账号已被绑定了',
      },
      {
        async validator(value, cb) {
          if (['phone', 'email'].indexOf(this.get('column')) != -1 || this.get('deletedAt') || !this.isNew) {
            cb(true);
            return;
          }
          var results = await Auth.find({user:this.get('user'), column: this.get('column'), deletedAt: {$exists: false}}).exec()
          cb(results.length < 3);
        },
        message: '最多只能绑定 3 个该类型账号',
      },
    ],
  },

  token: {
    type: Object,
    default: Object,
  },

  state: {
    type: Object,
    default: Object,
  },
  nickname: {
    type: Object,
    default: Object,
  },
  settings: {
    type: Object,
    default: Object,
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
    index:true,
  },
});



/**
 * 显示名称
 * @return {[type]} [description]
 */
schema.virtual('display').get(function() {
  var state = this.get('state')
  if (state.nickname) {
    return state.nickname;
  }
  if (state.username) {
    return state.username;
  }
  if (state.email) {
    return emailDisplay(state.email);
  }

  var value = this.get('value');
  switch (this.get('column')) {
    case 'email':
      value = emailDisplay(value);
      break;
    case 'phone':
      value = value.substr(0, 5) + '***' + value.substr(-3, 3);
      break;
    default:
      value = value.substr(0, parseInt(value.length / 3.5)) + '***' + value.substr(0 - parseInt(value.length / 3.5));
  }
  return value;
});


function emailDisplay(value) {
  value = value.split('@');
  if (value[0].length <= 3) {
    value[0] = '***';
  } else if (value[0].length <= 6) {
    value[0] = '***' + value[0].substr(-2, 2);
  } else if (value[0].length <= 8) {
    value[0] = value[0].substr(0, 2) + '***' + value[0].substr(-2, 2)
  } else {
    value[0] = value[0].substr(0, 3) + '***' + value[0].substr(-3, 3);
  }
  if (value[1] && value[1].length > 7) {
    value[1] = '***' + value[1].substr(parseInt(value[1].length / 2));
  }
  value = value.join('@')
  return value
}


/**
 * 删除敏感信息
 * @type {Boolean}
 */
schema.set('toJSON', {
  virtuals: true,
  transform(doc, ret) {
    delete ret.value;
    delete ret.token;
    delete ret.state;
  },
});




/**
 * 自动更新用户的属性
 * @return {[type]} [description]
 */
schema.pre('save', async function() {
  var column = this.get('column')
  if (['phone', 'email'].indexOf(column) == -1) {
    return
  }
  if (!this.isModified('deletedAt') && !this.isNew) {
    return
  }
  const User = require('./user').default
  var auth
  if (this.get('deletedAt')) {
    auth = await Auth.findOne({user:this.get('user'), column, _id:{$ne: this.get('_id')}, deletedAt: {$exists: false}}).read('primary').exec()
  } else {
    auth = this
  }

  var user = await User.findById(this.get('user')).read('primary').exec()

  var attributes = user.get('attributes')
  var index = attributes.indexOf(column)
  if (auth) {
    if (index == -1) {
      attributes.push(column)
      user.set('attributes', attributes)
    }
  } else if (index != -1) {
    attributes.splice(index, 1)
    user.set('attributes', attributes)
  }

  if (user.isModified('attributes')) {
    this.savePost(user)
  }
})




const Auth = model('Auth', schema);

export default Auth
