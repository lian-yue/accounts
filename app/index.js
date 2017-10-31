/* @flow */
import path        from 'path'
import Koa         from 'koa'
import koaStatic   from 'koa-static'
import statuses    from 'statuses'

import moment      from 'moment'

import packageInfo from 'package'

global.__SERVER__ = true

let models = require('./models')
let viewModels = require('viewModels').default

if (module.hot) {
  module.hot.accept(['models', 'viewModels'], function (): void {
    models = require('./models')
    viewModels = require('viewModels').default
  })
}

const app = new Koa

app.env = process.env.NODE_ENV || 'production'


app.context.onerror = function onerror(e: mixed): void {
  if (e === null) {
    return
  }

  let error = models.createError(e)

  let isSent = this.headerSent || !this.writable

  // 设置状码
  if (isSent) {
    // 已发送
  } else if (!this.status || this.status < 300 || this.status === 404 || error.status >= 500) {
    this.status = error.status
  }

  // 错误事件
  this.app.emit('error', error, this)

  // 408 主动断开, 已发送 headers, 不可写
  if (isSent || error.status === 408) {
    this.res.end()
    return
  }

  // 发布版不显示 500 错误信息
  if (app.env !== 'development' && error.status === 500) {
    error.message = statuses[error.status]
  }

  // 自定义 headers
  if (error.headers) {
    this.set(error.headers)
    // $flow-disable-line
    delete error.headers
  }

  // 消息列表
  if (error.messages) {
    // 存在 messages
  } else if (error.name === 'ValidationError' && error.errors && typeof error.errors === 'object') {
    // $flow-disable-line
    error.messages = []
    for (const fullpath in error.errors) {
      let value = error.errors[fullpath]
      if (!value) {
        continue
      }
      value = models.createError(value)
      // $flow-disable-line
      error.messages.push({
        fullpath,
        path: value.path || fullpath,
        type: value.type || value.kind || undefined,
        name: value.name,
        ...value
      })
    }
    // $flow-disable-line
    delete error.properties.errors
    delete error.errors
  } else {
    // $flow-disable-line
    error.messages = [
      {
        path: error.path || undefined,
        type: error.type || undefined,
        name: error.name,
        ...models.createError(error),
      }
    ]
  }

  this.type = 'json'
  this.res.end(JSON.stringify({
    error: error.message,
    status: error.status,
    name: error.name,
    ...error
  }))
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
    ctx.onerror(models.createError(504, 'Request timeout'))
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

  app.use(function (ctx, next) {
    return require('views/vue').default(ctx, next)
  })
  app.use(function (ctx, next) {
    return viewModels.middleware(ctx, next)
  })
} else {
  app.use(require('views/vue').default)
  app.use(viewModels.middleware)
}

// 404
app.use(function (ctx) {
  ctx.throw(404)
})


// 错误捕获
app.on('error', function (error: Error, ctx): void {
  let date: string = moment().format('YYYY-MM-DD hh:mm:ss')
  if (!error.status || Number(error.status) >= 500) {
    console.error(date, 'server error :', error, ctx)
  } else {
    console.warn(`${ctx.method} ${ctx.status} ${ctx.url} - ${date} - ${ctx.request.ip} - ${error.message}`)
  }
})


export default app
