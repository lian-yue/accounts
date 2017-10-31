/* @flow */
import crypto from  'crypto'
import Stream from 'stream'
import cache from 'models/cache'

import type { Context } from 'koa'

type RateLimitOption = {
  name: string,
  ip?: boolean,
  token?: boolean,
  user?: boolean,
  limit?: number,
  query?: {
    [string]: (value: string, ctx: Context) => string | Promise<string>
  },
  body?: {
    [string]: (value: string, ctx: Context) => string | Promise<string>
  },
  params?: {
    [string]: (value: string, ctx: Context) => string | Promise<string>
  },
  reset?: number,
  success?: boolean,
  before?: boolean,
  key?: (ctx: Context) => boolean | string,

  path?: string,
  method?: string,
}

export default (..._opts: RateLimitOption[]) => {
  let defaultOption = {
    name: '',
    ip: false,
    token: false,
    user: false,
    limit: 60,
    // query: {},
    // body: {},
    // params: {},
    reset: 1800,
    // success: false,
    before: false,
    key(ctx: Context) { return '' },

    path: 'page',
    method: 'request',
  }
  let opts = []
  for (let i = 0; i < _opts.length; i++) {
    opts.push({ ...defaultOption, ..._opts[i] })
  }

  return async (ctx: Context, next: () => Promise<void>) => {
    if (ctx.app.env === 'development') {
      await next()
      return
    }
    let newOpts = []
    let keys: string[] = []
    let values: number[] = []
    let ttls: number[] = []
    let maxLimit = 0

    for (let i = 0; i < opts.length; i++) {
      let opt = opts[i]
      let optKey = opt.key ? opt.key(ctx) : false
      let key: string[] = []
      if (typeof optKey !== 'string') {
        keys.push('')
        continue
      }
      key.push(optKey)

      if (opt.ip) {
        key.push(ctx.ip)
      }
      if (opt.token) {
        key.push(ctx.state.token ? ctx.state.token.get('id') : '')
      }
      if (opt.user) {
        key.push(ctx.state.token && ctx.state.token.get('user') ? ctx.state.token.get('user').get('id') : '')
      }

      if (opt.query && typeof opt.query === 'object') {
        await getKey(ctx, key, opt.query, ctx.request.query)
      }
      if (opt.body) {
        await getKey(ctx, key, opt.body, !(ctx.request.body instanceof Object) || Buffer.isBuffer(ctx.request.body) || ctx.request.body instanceof Stream ? {} : ctx.request.body)
      }
      if (opt.params) {
        await getKey(ctx, key, opt.params, ctx.params || {})
      }
      if (opt.limit && opt.limit > maxLimit) {
        maxLimit = opt.limit
      }

      newOpts.push(opt)
      keys.push(`rate.limit.${opt.name}.${crypto.createHash('md5').update(key.join('.')).digest('base64')}`)
    }

    if (!keys.length) {
      await next()
      return
    }


    let now: number = 0
    let limit = -1
    let reset = -1
    let path: string
    let method: string
    for (let i = 0; i < keys.length; i++) {
      let key = keys[i]
      let opt = newOpts[i]
      let value: number
      let ttl: number
      if (opt.before) {
        value = Number(await cache.incr(key))
        value--
        ttl = Number(await cache.ttl(key))
        if (ttl === -1) {
          ttl = opt.reset
          await cache.expire(key, opt.reset)
        }
      } else {
        value = Number(await cache.get(key))
        ttl = Number(await cache.ttl(key))
      }
      values.push(value)
      ttls.push(ttl)
      value = opt.limit - value
      if (value < 0) {
        value = 0
      }

      // 最小剩余数量
      if (limit > value || limit === -1) {
        path = opt.path
        method = opt.method
        limit = value
        reset = ttl < 0 ? opt.reset : ttl
        now = Date.now()
      }
    }


    reset = parseInt(now / 1000, 10) + reset
    ctx.set('X-RateLimit-Limit', String(maxLimit))
    ctx.set('X-RateLimit-Remaining', String(limit))
    ctx.set('X-RateLimit-Reset', String(reset))

    if (limit <= 0) {
      ctx.throw(403, 'ratelimit', { path, method, reset })
    }

    try {
      await next()
    } catch (e) {
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
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
          let value = Number(await cache.decr(key))
          if (value === 0) {
            await cache.del(key)
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
      let key = keys[i]

      if (opt.before) {
        // 强制储存
        if (ctx.state.rateLimit) {
          continue
        }

        // 没有强制不储存 并且 不完成
        if (ctx.state.rateLimit !== false && opt.success === false) {
          continue
        }
        let value = Number(await cache.decr(key))
        if (value === 0) {
          await cache.del(key)
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

        await cache.incr(key)
        if (ttls[i] < 0) {
          await cache.expire(key, opt.reset)
        }
      }
    }
  }
}

async function getKey(ctx: Context, keys: string[], names: {[string]: (value: string, ctx: Context) => string | Promise<string>}, values: Object) {
  for (let name in names) {
    let fn = names[name]
    let value = String(values[name] || '')
    keys.push(await Promise.resolve(fn(value, ctx)))
  }
}
