import crypto from  'crypto'
import cache from 'models/cache'

export default (...opts) => {
  var defaultOpt = {
    name: '',
    key: false,
    ip: false,
    token: false,
    user: false,
    limit: 60,
    query: {},
    body: {},
    params: {},
    reset: 1800,
    success: null,
    before: false,
    filter: (ctx) => true,
    message: 'Request too often please {TIME} and try again',
  }
  return async (ctx, next) => {
    if (ctx.app.env == 'development') {
      await next()
      return
    }
    var newOpts = []
    var keys = []
    var values = []
    var ttls = []
    var maxLimit = 0

    for (let i = 0; i < opts.length; i++) {
      let opt = opts[i]
      opt = Object.assign({}, defaultOpt, opt)
      if (!opt.filter(ctx)) {
        continue;
      }
      newOpts.push(opt)
      let key = []
      if (opt.key) {
        key.push(opt.key(ctx))
      }
      if (opt.ip) {
        key.push(ctx.ip)
      }
      if (opt.token) {
        key.push(ctx.state.token ? ctx.state.token.get('id') : '')
      }
      if (opt.user) {
        key.push(ctx.state.token && ctx.state.token.get('user') ? ctx.state.token.get('user').get('id') : '')
      }

      if (opt.query) {
        for (let name in opt.query) {
          let funcs = opt.query[name]
          let value = ctx.request.query[name]
          for (let i = 0; i < funcs.length; i++) {
            value = funcs[i](value, ctx)
            if (value instanceof Object && value.then) {
              value = await value
            }
          }
          key.push(value)
        }
      }
      if (opt.body) {
        for (let name in opt.body) {
          let funcs = opt.body[name]
          let value = ctx.request.body instanceof Object && ctx.request.body[name] ? ctx.request.body[name] : ''
          for (let i = 0; i < funcs.length; i++) {
            value = funcs[i](value)
            if (value instanceof Object && value.then) {
              value = await value
            }
          }
          key.push(value)
        }
      }
      if (opt.params) {
        for (let name in opt.params) {
          let funcs = opt.params[name]
          let value = ctx.params instanceof Object && ctx.params[name] ? ctx.params[name] : ''
          for (let i = 0; i < funcs.length; i++) {
            value = funcs[i](value, ctx)
            if (value instanceof Object && value.then) {
              value = await value
            }
          }
          key.push(value)
        }
      }
      keys.push(`rate.limit.${opt.name}.${crypto.createHash('md5').update(key.join('.')).digest("base64")}`)
      if (opt.limit > maxLimit) {
        maxLimit = opt.limit
      }
    }

    if (!keys.length) {
      await next()
      return
    }



    var now = Date.now()
    var limit = -1
    var reset = -1
    var message;
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      let opt = newOpts[i]
      let value
      if (opt.before) {
        value = await cache.incr(key)
        value--
        if (ttl < 0) {
          ttl = opt.reset
          await cache.expire(key, opt.reset)
        }
      } else {
        value = await cache.get(key)
      }
      let ttl = await cache.ttl(key)
      if (ttl == -1) {
        ttl = opt.reset
        await cache.expire(key, opt.reset)
      }
      values.push(value)
      ttls.push(ttl)
      value = opt.limit - value
      if (value < 0) {
        value = 0
      }

      // 最小剩余数量
      if (limit > value || limit == -1) {
        limit = value
        message = opt.message
        reset = ttl < 0 ? opt.reset : ttl
        now = Date.now()
      }
    }



    ctx.set('X-RateLimit-Limit', maxLimit)
    ctx.set('X-RateLimit-Remaining', limit)
    ctx.set('X-RateLimit-Reset', parseInt(now / 1000) + reset)

    if (limit <= 0) {
      var time
      if (reset < 60) {
        time = parseInt(reset / 60) + ' seconds'
      } else if (reset < 3600) {
        time = parseInt(reset / 60) + ' minutes'
      } else if (reset < 86400) {
        time = parseInt(reset / 3600) + ' hours'
      } else {
        time = parseInt(reset / 86400) + ' days'
      }
      time = ' '+ time
      ctx.throw(message.replace('{TIME}', time), 403, {reset, code: 'RATE_LIMIT'})
    }

    try {
      await next()
    } catch (e) {
      for (let i = 0; i < newOpts.length; i++) {
        let opt = newOpts[i]
        if (opt.before) {
          // 强制储存
          if (ctx.state.rateLimit) {
            continue
          }

          // 没有强制不储存 并且 不需要完成并且没过滤
          if (ctx.state.rateLimit !== false && !opt.success) {
            continue
          }

          let key = keys[i]
          await cache.incr(key)
          if (ttls[i] < 0) {
            await cache.expire(key, opt.reset)
          }
          let value = await cache.decr(key)
          if (value == 0) {
            await cache.del(value)
          }
        } else {
          // 强制不储存
          if (ctx.state.rateLimit === false) {
            continue
          }
          // 没有强制储存 并且 要完成或 已过滤
          if (!ctx.state.rateLimit && opt.success) {
            continue
          }

          let key = keys[i]
          await cache.incr(key)
          if (ttls[i] < 0) {
            await cache.expire(key, opt.reset)
          }
        }
      }
      throw e
    }




    for (let i = 0; i < newOpts.length; i++) {
      let opt = newOpts[i]
      if (opt.before) {
        // 强制储存
        if (ctx.state.rateLimit) {
          continue
        }

        // 没有强制不储存 并且 不完成
        if (ctx.state.rateLimit !== false && opt.success === false) {
          continue
        }

        let key = keys[i]
        await cache.incr(key)
        if (ttls[i] < 0) {
          await cache.expire(key, opt.reset)
        }
        let value = await cache.decr(key)
        if (value == 0) {
          await cache.del(value)
        }
      } else {
        // 强制不储存
        if (ctx.state.rateLimit === false) {
          continue
        }

        // 没有强制储存 并且 不完成
        if (!ctx.state.rateLimit && opt.success === false) {
          continue
        }

        let key = keys[i]
        await cache.incr(key)
        if (ttls[i] < 0) {
          await cache.expire(key, opt.reset)
        }
      }
    }


  }
}
