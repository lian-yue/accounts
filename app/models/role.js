import {Schema} from 'mongoose'

import model from './model'

// 127 以下是普通用户
// 255 无限制管理员
const schema = new Schema({
  level: {
    type: Schema.Types.Integer,
    default: 0,
    min: [0, '级别不能小于 0 年或大于 255 ({PATH})'],
    max: [255, '别不能小于 0 年或大于 255 ({PATH})'],
  },

  name: {
    type: String,
    required: [true, '角色名不能为空'],
    maxlength: [32, '角色名长度不能大于 32 字节'],
  },

  application: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'Application',
    required: true,
  },

  // 内容
  content: {
    type: String,
    maxlength: [255, '内容描述不能大于 255 字节 {PATH}'],
  },

  children: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Role',
      required: true,
      validate: [
        {
          validator(id) {
            return this.get('children').length <= 8
          },
          message: '继承用户组不能大于 8 个 ({PATH})',
        },
        {
          isAsync: true,
          async validator(id) {
            let role = await this.constructor.findById(id).read('primary').exec()
            return role && this.get('application').equals(role.get('application')) && !this.equals(role)
          },
          message: '继承用户组不存在 ({PATH})',
        },
      ],
    },
  ],

  rules: [
    {
      scope: {
        type: String,
        maxlength: [64, '规则长度不能大于 64 字节'],
        required: [true, '规则范围不能为空'],
        validate: [
          {
            validator(scope) {
              return this.get('rules').length <= 32
            },
            message: '规则数量不能大于 32 条 ({PATH})',
          },
        ]
      },
      state: {
        type: Schema.Types.Integer,
        default: 0,
        max: 1,
        min: -1,
      },
    }
  ],

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
})


export default model('Role', schema)
