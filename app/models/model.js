/* @flow */
import configMongodb from 'config/mongodb'
import mongoose, { Schema, Document, Error as MongooseError } from 'mongoose'
import createError from './createError'
import locale from './locale/default'

mongoose.Promise = global.Promise


MongooseError.ValidatorError.prototype.formatMessage = function (message: string, props: Object) {
  return locale.translation(['errors', props.type || message], message, props)
}

MongooseError.messages.general.default = locale.getLanguageValue(['errors', 'default'])
MongooseError.messages.general.required = locale.getLanguageValue(['errors', 'required'])

MongooseError.messages.Number.min = locale.getLanguageValue(['errors', 'min'])
MongooseError.messages.Number.max = locale.getLanguageValue(['errors', 'max'])

MongooseError.messages.Date.min = locale.getLanguageValue(['errors', 'min'])
MongooseError.messages.Date.max = locale.getLanguageValue(['errors', 'max'])

MongooseError.messages.String.enum = locale.getLanguageValue(['errors', 'enum'])
MongooseError.messages.String.match = locale.getLanguageValue(['errors', 'match'])
MongooseError.messages.String.minlength = locale.getLanguageValue(['errors', 'minlength'])
MongooseError.messages.String.maxlength = locale.getLanguageValue(['errors', 'maxlength'])



const db = mongoose.connect(configMongodb, { useMongoClient: true, poolSize: 10 })


// 数字类型
function Integer(key, options) {
  mongoose.SchemaType.call(this, key, options, 'Integer')
}

Integer.prototype = Object.create(Schema.Types.Number.prototype)
Integer.prototype.cast = function (value) {
  let _value = parseInt(value, 10)
  if (isNaN(_value)) {
    throw new Error(`Integer: ${value} is not a integer`)
  }
  return _value
}
Schema.Types.Integer = Integer


/**
 * 保存事件
 * @param  {Function} fn [description]
 * @param  {String} method [description]
 * @return this
 */
// $flow-disable-line
Document.prototype.oncePost = function oncePost(fn: Function, ignoreError: boolean = false) {
  fn.ignoreError = ignoreError
  this.$_oncePosts = this.$_oncePosts || []
  this.$_oncePosts.push(fn)
  return this
}

// $flow-disable-line
Document.prototype.setToken = function setToken(token?: TokenModel) {
  this.$_token = token
  return this
}
// $flow-disable-line
Document.prototype.getToken = function getToken() {
  return this.$_token
}

// $flow-disable-line
Document.prototype.can = async function can(options: string | string[] | {[key: string]: any}): Promise<void> {
  try {
    if (typeof options === 'string') {
      let fn = 'can' + options.replace(/(^|_|-)(.)/g, (value, value2, value3: string) => value3.toUpperCase())
      if (typeof this[fn] !== 'function') {
        throw createError(500, 'notexist', { path: 'method', value: fn })
      }
      let argsArray = [this.getToken()]
      if (arguments.length > 1) {
        argsArray.push(arguments[1])
      }
      await this[fn].apply(this, argsArray)
      return
    }

    if (options instanceof Array) {
      let argsArray = [this.getToken()]
      if (arguments.length > 1) {
        argsArray.push(arguments[1])
      }
      for (let i = 0; i < options.length; i++) {
        let name = options[i]
        let fn = 'can' + name.replace(/(^|_|-)(.)/g, (value, value2, value3: string) => value3.toUpperCase())
        if (typeof this[fn] !== 'function') {
          throw createError(500, 'notexist', { path: 'method', value: fn })
        }
        await this[fn].apply(this, argsArray)
      }
      return
    }
    for (let name in options) {
      let fn = 'can' + name.replace(/(^|_|-)(.)/g, (value, value2, value3) => value3.toUpperCase())
      if (typeof this[fn] !== 'function') {
        throw createError(500, 'notexist', { path: 'method', value: fn })
      }
      let argsArray = [this.getToken()]
      if (options[name]) {
        argsArray.push(options[name])
      } else if (arguments.length > 1) {
        argsArray.push(arguments[1])
      }
      await this[fn].apply(this, argsArray)
    }
  } catch (e) {
    e.can = true
    throw e
  }
}

// $flow-disable-line
Document.prototype.canBoolean = async function canBoolean(): Promise<boolean> {
  try {
    await this.can(...arguments)
  } catch (e) {
    return false
  }
  return true
}


/**
 * asyncMiddleware  中间件 增加 async，await 支持
 * @param  {Function} fn 原中间件
 * @return {Function}    修改后的的中间件
 */
// $flow-disable-line
Schema.prototype.preAsync = function preAsync(name: string, fn: Function) {
  if (fn.length === 2) {
    return this.pre(name, function (next: Function, done: Function) {
      let isNext: boolean = false
      let _next: Function = function () {
        if (isNext) {
          return
        }
        isNext = true
        next(...arguments)
      }
      Promise.resolve(fn.apply(this, [_next, done])).then(_next).catch(_next)
    })
  }
  return this.pre(name, function (next: Function) {
    let isNext: boolean = false
    let _next: Function = function () {
      if (isNext) {
        return
      }
      isNext = true
      next(...arguments)
    }
    Promise.resolve(fn.apply(this, [_next])).then(_next).catch(_next)
  })
}

// $flow-disable-line
Schema.prototype.postAsync = function postAsync(name: string, fn: Function) {
  if (fn.length === 3) {
    return this.post(name, function (error, res, next) {
      let isNext: boolean = false
      let _next: Function = function () {
        if (isNext) {
          return
        }
        isNext = true
        next(...arguments)
      }
      Promise.resolve(fn.apply(this, [error, res, _next])).then(_next).catch(_next)
    })
  }

  return this.post(name, function (res: any, next: Function) {
    let isNext: boolean = false
    let _next: Function = function () {
      if (isNext) {
        return
      }
      isNext = true
      next(...arguments)
    }
    Promise.resolve(fn.apply(this, [res, _next])).then(_next).catch(_next)
  })
}


export default function <Doc> (name: string, _schema: Object, options: Object = {}): Class<Doc> {
  let schema = _schema
  if (schema instanceof Schema) {
    for (let key in options) {
      schema.set(key, options[key])
    }
  } else {
    schema = new Schema(schema, options)
  }

  schema.postAsync('save', async function () {
    let posts = this.$_oncePosts || []
    delete this.$_oncePosts
    for (let i = 0; i < posts.length; i++) {
      let post = posts[i]
      try {
        await post.call(this)
      } catch (e) {
        if (!post.ignoreError) {
          throw e
        }
      }
    }
  })
  if (process.env.NODE_ENV === 'development') {
    // $flow-disable-line
    delete db.models[name]
  }

  return db.model(name, schema)
}
