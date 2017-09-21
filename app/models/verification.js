import nodemailer from 'nodemailer'
import {Schema} from 'mongoose'
import emailConfig from 'config/email'
import phoneConfig from 'config/phone'
import siteConfig from 'config/site'

import model from './model'

import * as validator from './validator'

import {TopClient} from './topClient'

const email = nodemailer.createTransport(emailConfig)

const phone = new TopClient(phoneConfig)


const schema = new Schema({
  ip: {
    type: String,
    default: '0.0.0.0',
  },

  token: {
    type: Schema.Types.ObjectId,
    index: true,
    ref: 'Token',
    required: true,
  },

  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },

  type: {
    type: String,
    index: true,
    required: [true, '验证类型不能为空'],
  },
  to: {
    type: String,
    required: [true, '发送地址不能为空'],
    validate: [
      {
        validator(to) {
          if (this.get('toType') !== 'email') {
            return true
          }
          let value = validator.email(to)
          if (!value) {
            return false
          }
          this.set('to', value)
          return true
        },
        message: '发送地址不是电子邮箱 ({PATH})',
      },
      {
        validator(to) {
          if (this.get('toType') !== 'sms') {
            return true
          }
          let value = validator.mobilePhone(to)
          if (!value) {
            return false
          }
          this.set('to', value)
          return true
        },
        message: '发送地址不是手机号 ({PATH})',
      },
    ]
  },
  toType: {
    type: String,
    required: true,
    enum: ['email', 'sms'],
  },
  code: {
    type: String,
  },
  error: {
    type: Number,
    default: 0,
  },
  usedAt: {
    type: Date,
  },
  nickname: {
    type: String,
    required: true,
  },
  used: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiredAt: {
    type: Date,
    index: true,
    default: () => {
      let date = new Date()
      date.setTime(date.getTime() + 1000 * 600)
      return date
    }
  },
})


schema.preAsync('save', async function () {
  if (!this.isNew) {
    return
  }
  let code = this.get('code')
  if (!code) {
    code = '000000' + Math.round(Math.random() * 999999).toString()
    code = code.substr(code.length - 6)
    this.set('code', code)
  }
  const to = this.get('to')
  const used = this.get('used')
  const nickname = this.get('nickname')

  switch (this.get('toType')) {
    case 'email':
      await new Promise(function (resolve, reject) {
        let data = {
          to,
          from: emailConfig.from,
          subject: `【${siteConfig.title}】 ${used} 验证码`,
          text: `您好 ${nickname}。 \r\n您的验证码为 ${code}  \r\n它用于${used}。`,
          html: `<p>您好 ${nickname.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}。 </p><p>您的验证码为  ${code}</p><p>它用于${used}。</p>`,
        }
        email.sendMail(data, (e, info) => {
          if (e) {
            return reject(e)
          }
          return resolve()
        })
      })
      break
    case 'sms':
      await new Promise((resolve, reject) => {
        phone.execute('alibaba.aliqin.fc.sms.num.send', {
          extend: '',
          sms_type: 'normal',
          sms_free_sign_name: phoneConfig.sms_free_sign_name,
          sms_param: JSON.stringify({used, nickname, code}),
          rec_num: to,
          sms_template_code: phoneConfig.sms_template_code,
        }, (e, response) => {
          if (response && response.error_response) {
            if (response.error_response.code === 15) {
              this.throw(403, '请求频率过快请稍后再试')
            }
          }
          if (e) {
            return reject(e)
          }
          resolve(null)
        })
      })
      break
    default:
      throw new Error('Verification type unknown')
  }
})




schema.set('toJSON', {
  transform(doc, ret) {
    delete ret.code
    delete ret.ip
    delete ret.to
  },
})


schema.statics.findByCode = async function findByCode(options) {
  let query = {
    token: options.token,
    type: options.type,
  }

  if (options.toType) {
    query.toType = options.toType
  }

  let verifications = await this.find(query, null, {
    limit: 3,
    sort: {
      expiredAt: -1,
    }
  }).exec()

  let isBreak = false
  let now = new Date
  let verification
  for (let i = 0; i < verifications.length; i++) {
    verification = verifications[i]
    // 已使用
    if (verification.get('usedAt')) {
      continue
    }

    // 已过期
    if (now > verification.get('expiredAt')) {
      continue
    }

    // 错误次数过多
    if (verification.get('error') >= 5) {
      continue
    }

    // user 不对
    if (options.user && (!verification.get('user') || !verification.get('user').equals(options.user))) {
      continue
    }

    // to 不对
    if (options.to && verification.get('to') !== options.to) {
      continue
    }

    // toType 不对
    if (options.toType && verification.get('toType') !== options.toType) {
      continue
    }

    // 验证值不对
    if (verification.get('code') !== options.code) {
      // 增加一次错误次
      await verification.update({$inc: {error: 1}}).exec()
      continue
    }

    isBreak = true
    break
  }

  if (!isBreak) {
    return null
  }

  if (!options.test) {
    verification.set('usedAt', now)
    await verification.save()
  }

  return verification
}


export default model('Verification', schema, {
  shardKey: {
    token: 1,
  },
})
