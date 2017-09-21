/* @flow */
import path        from 'path'
import Koa         from 'koa'
import koaStatic   from 'koa-static'
import statuses    from 'statuses'
import httpErrors  from 'http-errors'

import moment      from 'moment'

import 'source-map-support/register'

import packageInfo from 'package'

global.__SERVER__ = true

/* eslint-disable */
let models = require('models')
/* eslint-enable */
let viewModels = require('viewModels').default

if (module.hot) {
  module.hot.accept(['models', 'viewModels'], function (): void {
    models = require('models')
    viewModels = require('viewModels').default
  })
}


const app = new Koa

app.env = process.env.NODE_ENV || 'production'
app.context.onerror = function onerror(e: mixed): void {
  let err = e
  if (!err) {
    return
  } else if (typeof err === 'number') {
    err = httpErrors(err)
  } else if (err instanceof httpErrors) {
    // has httpErrors
  } else if (typeof err === 'object') {
    let status: number
    let message: string
    if (typeof err.status === 'number' && err.status >= 400 && err.status < 600) {
      status = err.status
    } else if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600) {
      status = err.statusCode
    } else if (err.code === 'ENOENT') {
      // ENOENT support
      status = 404
    } else if (err.code === 'HPE_INVALID_EOF_STATE' || err.code === 'ECONNRESET' || err.message === 'Request aborted') {
      status = 408
    } else if (err.name === 'ValidationError' || err.name === 'ValidatorError' || err.code === 'ValidationError' || err.code === 'ValidatorError') {
      status = 403
    } else if (this.status >= 400) {
      status = this.status
    } else {
      status = 500
    }
    message = String(err.message || statuses[status] || 'Server error')
    err = httpErrors(status, message, err)
  } else {
    err = httpErrors(500, String(err))
  }


  // 设置状码
  if (!this.status || this.status < 300 || this.status === 404 || err.status >= 500) {
    this.status = err.status
  }

  // 错误事件
  this.app.emit('error', err, this)

  // 408 链接被断开直接返回
  if (err.status === 408) {
    return
  }


  // 不可写 已发送 headers
  if (this.headerSent || !this.writable) {
    err.headerSent = true
    return
  }

  // 不是 development 模式
  if ((err.status === 500 && app.env !== 'development') || !err.message) {
    err.message = statuses[err.status]
  }

  // 自定义 headers
  if (err.headers) {
    this.set(err.headers)
    delete err.headers
  }

  // 消息归类
  if (err.messages) {
    // 存在 messages
  } else if (err.name === 'ValidationError' && err.errors) {
    err.messages = []
    for (const key in err.errors) {
      const message = err.errors[key]
      err.messages.push({
        code: message.code || message.name,
        path: message.path || key,
        message: message.message,
        ...message,
      })
    }
    delete err.errors
  } else {
    err.messages = [
      {
        message: err.message,
        ...err,
      },
    ]
  }
}

app.context.vmState = function vmState(state: Object = {}, status: number = 200): Object {
  let vm: Object = state
  if (typeof vm.toJSON === 'function') {
    vm = vm.toJSON()
  }

  this.status = status
  this.state.vm = this.state.vm || {}
  return Object.assign(this.state.vm, vm)
}

app.context.versionCompare = function versionCompare(version: string): boolean {
  let queryVersion: mixed
  let versionArray: Array<string>
  if (this.query.version) {
    queryVersion = this.query.version
  } else if (this.request.body instanceof Object && this.request.body.version) {
    queryVersion = this.request.body.version
  } else if (this.request.body instanceof Object && this.request.body.fields instanceof Object && this.request.body.fields.version) {
    queryVersion = this.request.body.fields.version
  }

  if (!queryVersion && typeof queryVersion !== 'string') {
    return true
  }

  queryVersion = String(queryVersion).split('.')
  versionArray = version.split('.')

  for (let i = 0; i < versionArray.length; i++) {
    let value1 = parseInt(version[i], 10)
    let value2 = parseInt(queryVersion[i], 10) || 0
    if (value1 > (value2 || 0)) {
      return false
    }
  }
  return true
}

app.context.viewModel = function viewModel() {
  return viewModels.match(this, ...arguments)
}


// public file
app.use(koaStatic(path.join(__dirname, '../public')))



// access log
app.use(async function (ctx, next) {
  let start = new Date
  await next()
  let ms = new Date - start
  let userAgent = ctx.request.header['user-agent'] || ''
  console.log(`${ctx.method} ${ctx.status} ${ctx.url} - ${moment(start).format('YYYY-MM-DD hh:mm:ss')} - ${ms}ms - ${ctx.request.ip} - ${userAgent}`)
  ctx.set('X-Response-Time', ms + 'ms')
  ctx.set('X-Version', packageInfo.version)
  ctx.set('X-Author', packageInfo.author)
})



// timeout
app.use(async function (ctx, next) {
  let clear = setTimeout(function () {
    clear = null
    ctx.onerror(httpErrors(502, 'Request timeout'))
  }, 60000)

  try {
    await next()
  } catch (e) {
    throw e
  } finally {
    clearTimeout(clear)
    clear = null
  }
})

// headers
app.use(async function (ctx, next) {
  ctx.set('X-Content-Type-Options', 'nosniff')
  ctx.set('X-Frame-Options', 'SAMEORIGIN')
  await next()
})

// views  viewModels
if (process.env.NODE_ENV === 'development') {
  // delay
  app.use(async function (ctx, next) {
    await new Promise(function (resolve, reject) {
      setTimeout(function () {
        resolve()
      }, 40 + parseInt(Math.random() * 500, 10))
    })
    await next()
  })

  // app.use(function(ctx, next) {
  //   return require('views/vue').default(ctx, next)
  // })
  app.use(function (ctx, next) {
    return viewModels.middleware(ctx, next)
  })
} else {
  // app.use(require('views/vue').default)
  app.use(viewModels.middleware)
}

// 404
app.use(function (ctx) {
  ctx.throw(404)
})


// 错误捕获
app.on('error', function (err: Error, ctx): void {
  let date: string = moment().format('YYYY-MM-DD hh:mm:ss')
  if (!err.status || err.status >= 500) {
    console.error(date, 'server error :', err, ctx)
  } else {
    console.warn(`${ctx.method} ${ctx.status} ${ctx.url} - ${date} - ${ctx.request.ip} - ${err.message}`)
  }
})


export default app
