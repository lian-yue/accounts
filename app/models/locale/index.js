/* @flow */
import { languageList, nameList, timezoneList } from 'config/locale'

type Token = {
  type: string,
  value: string,
  children?: Token[],
}


type State = {
  before: string,
  char: string,
  after: string,
  tokens: Token[],
}

type LanguagePack = {
  [string]: any,
}

export default class Locale {

  tokensCache: { [string]: (Token[]) } = {}

  quotes: { [string]: RegExp } = {
    '`': /[\\\\`]/,
    '"': /[\\\\"]/,
    "'": /[\\\\']/,
  }

  name: string = 'en'

  language: string = 'en'

  languagesPack: {[string]: LanguagePack} = {}

  timezone: string = 'UTC'

  timezoneInfo: number[] = [0, 1]

  nameList: {[string]: string[]} = nameList

  languageList: {[string]: boolean} = languageList

  timezoneList: {[string]: number[]} = timezoneList

  constructor(language?: string, languagePack?: LanguagePack): void {
    if (language) {
      this.setLanguage(language)
    }
    if (languagePack) {
      this.setLanguagePack(languagePack)
    }
  }

  formatName(value: string): string {
    let arr = value.trim().split(/[_-]/)
    arr[0] = arr[0].toLowerCase()
    if (arr[2]) {
      arr[2] = arr[2].toUpperCase()
      if (arr[1]) {
        arr[1] = arr[1].charAt(0).toUpperCase() + arr[1].substr(1)
      }
    } else if (arr[1] && arr[1].length > 2) {
      arr[1] = arr[1].charAt(0).toUpperCase() + arr[1].substr(1)
    } else if (arr[1]) {
      arr[1] = arr[1].toUpperCase()
    }
    return arr.join('-')
  }


  getName(): string {
    return this.name
  }

  setName(name: string): boolean {
    let name2 = this.formatName(name)
    let data = this.nameList[name2]
    if (!data) {
      return false
    }
    this.name = name2
    this.setLanguage(data[0])
    this.setTimezone(data[1])
    return true
  }

  getLanguage(): string {
    return this.language
  }

  setLanguage(language: string): boolean {
    let name = this.formatName(language)
    if (!this.languageList[name]) {
      return false
    }
    this.language = name
    return true
  }


  getLanguagePack(names?: string | string[]): LanguagePack | void {
    if (!names || !names.length) {
      return this.languagesPack[this.language]
    }

    let keys: string[]
    if (typeof names === 'string') {
      keys = names.split('.')
    } else {
      keys = names
    }


    let value = this.languagesPack[this.language]
    for (let i = 0; i < keys.length; i++) {
      if (!value || typeof value !== 'object') {
        return
      }
      value = value[keys[i]]
    }
    if (!value || typeof value !== 'object') {
      return
    }
    return value
  }

  getLanguageValue(path: string | string[]): string {
    let names: string[]
    if (typeof path === 'string') {
      names = path.split('.')
    } else {
      names = path
    }
    let value = this.languagesPack[this.language]
    for (let i = 0; i < names.length; i++) {
      if (!value || typeof value !== 'object') {
        return ''
      }
      value = value[names[i]]
    }
    if (typeof value !== 'string') {
      return ''
    }
    return value
  }


  setLanguagePack(languagePack: LanguagePack, append: boolean = true, language: string = this.language): boolean {
    if (append) {
      if (!this.languagesPack[language]) {
        this.languagesPack[language] = {}
      }
      Object.assign(this.languagesPack[language], languagePack)
    } else {
      this.languagesPack[language] = languagePack
    }
    return true
  }


  setTimezone(timezone: string): boolean {
    let name = this.formatName(timezone)
    let timezoneInfo = this.timezoneList[name]
    if (!timezoneInfo) {
      return false
    }
    this.timezoneInfo = timezoneInfo
    this.timezone = name
    return true
  }

  getTimezone(): string {
    return this.timezone
  }

  getTimezoneInfo(timezone: string = this.timezone): void | number[] {
    if (timezone === this.timezone) {
      return this.timezoneInfo
    }
    return this.timezoneList[timezone]
  }


  tokenSearch(state: State, search: RegExp): boolean {
    let index: number = 0

    state.before = ''

    // 查找下一个字符
    while ((index = state.after.search(search)) !== -1) {
      state.char = state.after.charAt(index)

      // 储存
      if (state.char === '\\') {
        state.before += state.after.substr(0, index) + state.after.charAt(index + 1)
        state.after = state.after.substr(index + 2)
        continue
      } else if (this.quotes[state.char]) {
        index++
        state.before += state.after.substr(0, index)
        state.after = state.after.substr(index)
        while (state.after && (index = state.after.search(this.quotes[state.char])) !== -1) {
          if (state.char === '\\') {
            state.before += state.after.substr(0, index) + state.after.charAt(index + 1)
            state.after = state.after.substr(index + 2)
          }
          index++
          state.before += state.after.substr(0, index)
          state.after = state.after.substr(index)
          break
        }
        continue
      }

      state.before += state.after.substr(0, index)
      state.after = state.after.substr(index + 1)
      break
    }

    if (index === -1) {
      state.before += state.after
      state.char = ''
      state.after = ''
      return false
    }
    return true
  }


  tokenArg(_value: string): Token {
    let value = _value.trim()
    if (!value) {
      return { type: 'string', value: '' }
    }

    let mark = value.charAt(0)

    if (this.quotes[mark]) {
      value = value.length > 1 && value.charAt(value.length - 1) === mark ? value.substr(1, value.length - 2) : value.substr(1)
      if (mark === '`' && value) {
        return { type: 'format', value }
      }
      return { type: 'string', value }
    }

    let type: string
    if (/^[0-9a-zA-Z_.-]+$/.test(value)) {
      type = 'param'
    } else {
      type = 'string'
    }

    return { type, value }
  }

  tokenFilter(state: State): boolean {
    // 不支持 多个过滤器
    let children: Token[] = []

    if (state.char === '|') {
      children.push(this.tokenArg(state.before))
      this.tokenSearch(state, /[\\\\(}]/)
    }

    let name = state.before.trim()

    if (state.char === '(') {
      do {
        this.tokenSearch(state, /[\\\\,)"'`]/)
        children.push(this.tokenArg(state.before))
      } while (state.after && state.char === ',')
    }

    // 没参数返回 false
    if (!children.length) {
      return false
    }

    state.tokens.push({ type: 'filter', value: 'filter' + name.charAt(0).toUpperCase() + name.substr(1), children })
    return true
  }

  tokenExec(state: State): boolean {
    if (state.char !== '{') {
      return false
    }
    do {
      this.tokenSearch(state, /[\\\\}|(]/)
      if (state.char === '(' || state.char === '|') {
        // 匹配到过滤器
        this.tokenFilter(state)
      } else {
        // 退出
        let temp = state.before.trim()
        if (temp) {
          state.tokens.push({ type: 'param', value: temp })
        }
      }
    } while (state.after && state.char !== '}')
    return true
  }


  tokens(value: string): Token[] {
    let state: State = {
      tokens: [],
      before: '',
      char: '',
      after: value,
    }
    do {
      this.tokenSearch(state, /[\\\\{]/)
      if (state.before) {
        state.tokens.push({ type: 'string', value: state.before })
      }
      this.tokenExec(state)
    } while (state.after)
    return state.tokens
  }




  format(value: string, props?: Object = {}): string {
    if (!value) {
      return value
    }
    if (!this.tokensCache[value]) {
      this.tokensCache[value] = this.tokens(value)
    }

    let tokens: Token[] = this.tokensCache[value]
    let result: string = ''
    let args: any[]
    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i]
      switch (token.type) {
        case 'string':
          result += token.value
          break
        case 'param':
          result += typeof props[token.value] === 'undefined' ? '' : String(props[token.value])
          break
        case 'filter':
          args = []
          token.children = token.children || []
          for (let ii = 0; ii < token.children.length; ii++) {
            let arg = token.children[ii]
            let val: any
            switch (arg.type) {
              case 'string':
                val = arg.value
                break
              case 'param':
                val = props[arg.value]
                break
              case 'format':
                val = this.format(arg.value, props)
                break
              default:
                val = ''
                break
            }
            args.push(val)
          }
          // $flow-disable-line
          if (typeof this[token.value] === 'function') {
            // $flow-disable-line
            result += this[token.value](...args)
          } else {
            throw new Error(`The ${token.value} method not exists`)
          }
          break
      }
    }
    return result
  }


  formatTimeLength(length: number): string {
    if (isNaN(length) || !length) {
      return '00:00'
    }
    if (length < 60) {
      return '00:' + length
    }
    return (length < 600 ? '0' : '') + Math.floor(length / 60) + ':' + length
  }

  formatDate(arg: any, format: string = 'w3c', timezone?: string): string {
    let date: Date
    date = new Date(arg)
    if (isNaN(date)) {
      return 'NaN'
    }
    switch (format) {
      case 'diff': {
        let languagePack: Object = this.getLanguagePack(['date']) || {}
        let time = Math.round((Date.now() - date.getTime()) / 1000)

        let key: string
        if (time < 0) {
          key = 'after'
        } else {
          key = 'before'
        }

        if (time < 0) {
          time = 0 - time
        }

        let text: string
        let value: number
        if (time < 60) {
          value = time
          text = languagePack.diff.second
        } else if (time < 60 * 60) {
          value = Math.ceil(time / 60)
          text = languagePack.diff.minute
        } else if (time <= 60 * 60 * 24) {
          value = Math.floor(time / (60 * 60))
          text = languagePack.diff.hour
        } else if (time <= 60 * 60 * 24 * 30) {
          value = Math.floor(time / (60 * 60 * 24))
          text = languagePack.diff.day
        } else if (time < 60 * 60 * 24 * 30 * 365) {
          value = Math.floor(time / (60 * 60 * 24 * 30))
          text = languagePack.diff.month
        } else {
          value = Math.floor(time / (60 * 60 * 24 * 30 * 365))
          text = languagePack.diff.year
        }
        if (value === 0) {
          value = 1
        }
        return this.format(languagePack.date.diff[key], { value: this.format(text, { value }) })
      }
      case 'unix':
        return String(Math.ceil(date.getTime() / 1000))
      case 'utc':
        return date.toUTCString()
      case 'iso':
        return date.toISOString()
      default: {
        let timezoneInfo = this.getTimezoneInfo(timezone) || this.timezoneInfo
        let languagePack: Object = this.getLanguagePack(['date']) || {}


        // 强制设置时区
        if (timezoneInfo[0]) {
          date.setTime(date.getTime() + timezoneInfo[0] * 60 * 1000)
        }

        let YYYY = date.getUTCFullYear()
        let YY = YYYY.toString().substr(2)

        let M = date.getUTCMonth() + 1
        let MM = String(M < 10 ? '0' + M : M)
        let MMM: string = languagePack.monthsShort[date.getUTCMonth()]
        let MMMM: string = languagePack.months[date.getUTCMonth()]

        let d = date.getUTCDay() + 1
        let dd = languagePack.weeksDayShort[date.getUTCDay()]
        let ddd = languagePack.weeksDay[date.getUTCDay()]

        let D = date.getUTCDate()
        let DD = String(D < 10 ? '0' + D : D)


        let h = date.getUTCHours()
        let hh = String(h < 10 ? '0' + h : h)

        let H = h > 12 ? h - 12 : h
        let HH = H < 10 ? ('0' + H.toString()) : H.toString()

        let m = date.getUTCMinutes()
        let mm = String(m < 10 ? '0' + m : m)

        let s = date.getUTCSeconds()
        let ss = String(s < 10 ? '0' + s : s)


        let zoneOffset = timezoneInfo[0]
        let zoneHours = Math.floor(zoneOffset / 60)
        if (zoneOffset >= 0) {
          zoneHours = '+' + String(zoneHours)
        } else {
          zoneHours = zoneHours === -1 ? '-0' : String(zoneHours + 1)
        }
        if (zoneHours.length < 3) {
          zoneHours = zoneHours.charAt(0) + '0' + zoneHours.charAt(1)
        }
        let zoneMinutes = zoneOffset % 60
        if (zoneMinutes < 0) {
          zoneMinutes = 0 - zoneMinutes
        }
        if (zoneMinutes < 10) {
          zoneMinutes = '0' + zoneMinutes
        }
        let Z = zoneHours + zoneMinutes
        let ZZ = zoneHours + ':' + zoneMinutes


        let a: string = ''
        for (let i in languagePack.meridiem) {
          if (h < Number(i)) {
            a = languagePack.meridiem[i]
          }
        }
        let A = a.toUpperCase()

        let props = {
          YYYY,
          YY,

          MMMM,
          MMM,
          MM,
          M,

          ddd,
          dd,
          d,

          DD,
          D,

          HH,
          H,

          hh,
          h,

          mm,
          m,

          ss,
          s,

          ZZ,
          Z,

          A,
          a,
        }

        if (format === 'calendar') {
          let day = new Date(date)
          day.setTime(Date.now())
          day.setUTCHours(0)
          day.setUTCMinutes(0)
          day.setUTCSeconds(0, 0)

          if (date.getTime() >= day.getTime()) {

            // 今天
            day.setUTCDate(day.getUTCDate() + 1)
            if (day.getTime() > date.getTime()) {
              return this.format(languagePack.formats.sameDay, props)
            }

            // 明天
            day.setUTCDate(day.getUTCDate() + 1)
            if (day.getTime() > date.getTime()) {
              return this.format(languagePack.formats.nextDay, props)
            }

            // 这周
            day.setUTCDate(day.getUTCDate() - 2)
            day.setUTCDate(day.getDate() - day.getDay() + timezoneInfo[1] + 7)
            if (day.getTime() > date.getTime()) {
              return this.format(languagePack.formats.sameWeek, props)
            }

            // 下周
            day.setUTCDate(day.getUTCDate() + 7)
            if (day.getTime() > date.getTime()) {
              return this.format(languagePack.formats.nextWeek, props)
            }
          } else {
            // 昨天
            day.setUTCDate(day.getUTCDate() - 1)
            if (date.getTime() >= day.getTime()) {
              return this.format(languagePack.formats.lastDay, props)
            }

            // 这周
            day.setUTCDate(day.getUTCDate() + 1)
            day.setUTCDate(day.getUTCDate() - day.getUTCDay() + timezoneInfo[1])
            if (date.getTime() >= day.getTime()) {
              return this.format(languagePack.formats.sameWeek, props)
            }

            // 上周
            day.setUTCDate(day.getUTCDate() - 7)
            if (date.getTime() >= day.getTime()) {
              return this.format(languagePack.formats.lastWeek, props)
            }
          }
        }
        return this.format(languagePack.formats[format] || format, props)
      }
    }
  }



  // 翻译
  translation(path: string | string[], defaultValue?: Object | string = {}, props?: Object = {}): string {
    let value = this.getLanguageValue(path)
    if (!value && typeof defaultValue === 'string') {
      value = defaultValue
    }
    return this.format(value, defaultValue && typeof defaultValue === 'object' ? defaultValue : props)
  }


  filterWhere(value1: string = '', operator: string = '', value2: string = '', trueValue: any = '', falseValue: any = ''): string {
    let isTrue = false
    switch (operator) {
      case '>=':
        isTrue = value1 >= value2
        break
      case '>':
        isTrue = value1 > value2
        break
      case '<=':
        isTrue = value1 <= value2
        break
      case '<':
        isTrue = value1 < value2
        break
      case '!=':
        // eslint-disable-next-line
        isTrue = value1 != value2 || Boolean(value1) !== Boolean(value2)
        break
      default:
        // eslint-disable-next-line
        isTrue = value1 == value2 || String(value1 || '') === String(value2 || '')
        break
    }

    let value = isTrue ? trueValue : falseValue
    return String(value)
  }


  filterUpperCase(value: any = ''): string {
    return String(value).toUpperCase()
  }

  filterLowerCase(value: any = ''): string {
    return String(value).toLowerCase()
  }

  filterTranslation(prefix: string = '', path: string, defaultValue: string | Object = {}, props: Object = {}): string {
    return this.translation(prefix + '.' + path, defaultValue, props)
  }

  filterLength(value: string = ''): string {
    return String(value.length)
  }

  filterDate(arg: any, format: string = 'w3c'): string {
    return this.formatDate(arg, format)
  }

  filterTimeLength(arg: any): string {
    return this.formatTimeLength(Number(arg))
  }
}
