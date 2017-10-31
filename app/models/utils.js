/* @flow */
import validator from 'validator'
import ip from 'ip'


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

export function matchEmail(value: any): boolean | string {
  if (!validator.isEmail(value, { allow_utf8_local_part: false })) {
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



export function matchMobilePhone(value: any): boolean | string {
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



export function matchIP(value: any, value2: string = ''): boolean | string {
  if (typeof value !== 'string') {
    return false
  }
  let isV4 = ip.isV4Format(value)
  let isV6 = ip.isV6Format(value)
  if (!isV4 && !isV6) {
    return false
  }
  switch (value2) {
    case '':
      break
    case '4':
      if (!isV4) {
        return false
      }
      break
    case '6':
      if (!isV6) {
        return false
      }
      break
    default:
      if (value2.indexOf('/') === -1) {
        if (!ip.isEqual(value, value2)) {
          return false
        }
      } else if (ip.cidrSubnet(value2).contains(value)) {
        return false
      }
  }
  return value
}

export function matchCidrIP(value: any, version: string = ''): boolean | {ip: string, cidr: number} {
  if (typeof value !== 'string') {
    return false
  }
  let index = value.indexOf('/')
  if (index === -1) {
    return false
  }

  let xip: string = value.substr(0, index)

  if (!matchIP(xip, version)) {
    return false
  }

  let cidr = parseInt(value.substr(index), 10)

  let maxCidr = value.indexOf(':') === -1 ? 32 : 128
  if (cidr < 1 || cidr > maxCidr) {
    return false
  }
  return { ip: xip, cidr }
}



export function hideIP(value: string): string {
  if (!value || value === '0.0.0.0') {
    return value
  }
  let separator = value.indexOf(':') === -1 ? '.' : ':'
  let arr = value.split(separator)
  if (arr.length <= 4) {
    arr[arr.length - 1] = '*'
  } else {
    arr[arr.length - 1] = '*'
    arr[arr.length - 2] = '*'
  }
  return arr.join(separator)
}
