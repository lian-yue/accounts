/* @flow */
import validator from 'validator'



const locales = [
  // 'ar-DZ',
  // 'ar-SY',
  // 'en-US',
  // 'cs-CZ',
  // 'de-DE',
  // 'da-DK',
  // 'el-GR',
  // 'en-AU',
  // 'en-GB',
  // 'en-HK',
  // 'en-IN',
  // 'en-NZ',
  // 'en-ZA',
  // 'en-ZM',
  // 'es-ES',
  // 'fi-FI',
  // 'fr-FR',
  // 'hu-HU',
  // 'ms-MY',
  // 'nb-NO',
  // 'nn-NO',
  // 'pl-PL',
  // 'pt-BR',
  // 'pt-PT',
  // 'ru-RU',
  // 'tr-TR',
  // 'vi-VN',
  'zh-CN',
  // 'zh-TW',
]

export function email(value: any): boolean | string {
  if (!validator.isEmail(value, {allow_utf8_local_part: false})) {
    return false
  }

  if (!/^[0-9A-Za-z.+_-]+\@[0-9A-Za-z.-]+$/.test(value)) {
    return false
  }

  if (value.length > 64) {
    return false
  }

  return value.toLowerCase()
}



export function mobilePhone(value: any): boolean | string {
  let phone = value
  if (!phone || typeof phone !== 'string') {
    return false
  }
  let char = phone.charAt(0)
  if (char === '0') {
    phone = '+' + phone
  } else if (char !== '+') {
    phone = '+86' + phone
  }
  phone = phone.replace(/^\+0+/, '+0').replace(/[ _-]/g, '')
  let test = false
  for (let i = 0; i < locales.length; i++) {
    if (validator.isMobilePhone(phone, locales[i])) {
      test = true
      break
    }
  }

  if (!test) {
    return false
  }

  if (phone.substr(0, 3) === '+86') {
    phone = phone.substr(3)
  }
  return phone
}



export function ip(value: any): boolean | string {
  return validator.isIP(value)
}
