/* @flow */
import nodemailer from 'nodemailer'
import { Schema, type MongoId } from 'mongoose'
import emailConfig from 'config/email'
import phoneConfig from 'config/phone'
import siteConfig from 'config/site'

import  { matchEmail, matchMobilePhone } from './utils'

import locale from './locale/default'
import createError from './createError'

import model from './model'


import { TopClient } from './topClient'

const emailSend = nodemailer.createTransport(emailConfig)

const phoneSend = new TopClient(phoneConfig)


const schema: Schema<VerificationModel> = new Schema({
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
    required: true,
  },
  to: {
    type: String,
    required: true,
    validate: [
      {
        validator(to) {
          let toType: string = this.get('toType')
          let value
          switch (toType) {
            case 'email':
              value = matchEmail(to)
              break
            case 'sms':
              value = matchMobilePhone(to)
              toType = 'phone'
              break
          }
          if (!value) {
            this.invalidate(toType, locale.getLanguagePackValue(['errors', 'match']), to, 'match')
            return
          }
          this.set('to', value)
          return true
        },
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
    default() {
      let code = '000000' + Math.round(Math.random() * 999999).toString()
      return code.substr(code.length - 6)
    }
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
    default: '',
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiredAt: {
    type: Date,
    index: true,
    default() {
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

  const to: string = this.get('to')
  const toType: string = this.get('toType')
  const type = this.get('type')
  const code = this.get('code')
  const nickname: string = this.get('nickname')

  switch (toType) {
    case 'email':
      await new Promise(function (resolve, reject) {
        let data = {
          to,
          from: emailConfig.from,
          subject: `【${siteConfig.title}】 ${type} 验证码`,
          text: `您好 ${nickname}。 \r\n您的验证码为 ${code}  \r\n它用于${type}。`,
          html: `<p>您好 ${nickname.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}。 </p><p>您的验证码为  ${code}</p><p>它用于${type}。</p>`,
        }
        emailSend.sendMail(data, function (e, info) {
          if (e) {
            return reject(e)
          }
          return resolve()
        })
      })
      break
    case 'sms':
      await new Promise((resolve, reject) => {
        phoneSend.execute('alibaba.aliqin.fc.sms.num.send', {
          extend: '',
          sms_type: 'normal',
          sms_free_sign_name: phoneConfig.sms_free_sign_name,
          sms_param: JSON.stringify({ type, nickname, code }),
          rec_num: to,
          sms_template_code: phoneConfig.sms_template_code,
        }, function (e, response) {
          if (response && response.error_response) {
            if (response.error_response.code === 15) {
              throw createError(403, 'ratelimit', {
                path: 'verification',
                reset: Date.now() + 60 * 1000,
                method: 'send',
              })
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
      throw createError(500, 'enum', { path: 'toType', value: toType })
  }
})




schema.set('toJSON', {
  transform(doc: VerificationModel, ret) {
    delete ret.code
    delete ret.ip
    delete ret.to
  },
})


schema.statics.findByCode = async function findByCode(options: {
  token: MongoId | TokenModel,
  type: string,
  code: string,
  user?: MongoId | UserModel,
  to?: string,
  toType?: string,
  test?: boolean,
}): Promise<void | VerificationModel> {

  let query: Object = {
    token: options.token,
    type: options.type,
  }

  if (options.toType) {
    query.toType = options.toType
  }

  let verifications: VerificationModel[] = await this.find(query, null, {
    limit: 3,
    sort: {
      expiredAt: -1,
    }
  }).exec()

  let isBreak = false
  let now = new Date
  let verification: VerificationModel
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
    if (options.user && options.user.equals && !options.user.equals(verification.get('user'))) {
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
      await verification.update({ $inc: { error: 1 } })
      continue
    }

    isBreak = true
    break
  }

  if (!isBreak || !verification) {
    return
  }

  if (!options.test) {
    verification.set('usedAt', now)
    await verification.save()
  }

  return verification
}


export default (model('Verification', schema, {
  shardKey: {
    token: 1,
  },
}): Class<VerificationModel>)
