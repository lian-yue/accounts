/* @flow */
import pathToRegExp from 'path-to-regexp'
import queryString from 'querystring'

import type { Context } from 'koa'

const debug = require('debug')('vm:router')

type Middleware = (ctx: Context, next?: () => Promise<void>) => Promise<void> | void

// eslint-disable-next-line
type Middlewares = Array<Middleware | Router | string | RegExp | Array<string | RegExp> | Object>

export default class Router {

  stack: Route[] = []

  allowMethods: string[] = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE']


  methodMiddlewares(method: string, path: string): Array<Middleware | {route: Route, matches: Object}> {
    let middlewares: Object[] = []

    let isBreak: boolean = false
    for (let i = 0; i < this.stack.length; i++) {
      let route = this.stack[i]
      if (route.methods.length && route.methods.indexOf(method) === -1) {
        continue
      }
      let matches
      if (route.regexp && !(matches = path.match(route.regexp))) {
        continue
      }
      middlewares.push({
        route,
        matches,
      })
      for (let ii = 0; ii < route.middleware.length; ii++) {
        let middleware = route.middleware[ii]
        if (middleware instanceof this.constructor) {
          middlewares.push(...middleware.methodMiddlewares(method, matches && matches[0].length ? path.substr(matches[0].length) : path))
          if (route.path) {
            isBreak = true
          }
        } else {
          middlewares.push(middleware)
        }
      }
      if (isBreak) {
        break
      }
    }
    return middlewares
  }

  async match(ctx: Context, method: string = 'GET', path: string = '/', _query: Object | string = {}, body?: any, next: () => void = () => undefined): Promise<Object | void> {
    let query = _query
    if (typeof query === 'string') {
      query = queryString.parse(query)
    }

    if (this.allowMethods.indexOf(method) === -1) {
      ctx.throw(405)
    }

    // 如果全是 use 就。。404
    let middlewares = this.methodMiddlewares(method, path)
    let is404 = true
    for (let i = 0; i < middlewares.length; i++) {
      let middleware = middlewares[i]
      if (typeof middleware === 'object' && middleware.route && !middleware.route.use) {
        is404 = false
        break
      }
    }

    if (is404) {
      next()
      return
    }


    let req = ctx.request

    debug('%s %s', method, path)
    let reqState = {
      params: ctx.params || {},
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      vmState: ctx.state.vm,
    }
    delete ctx.state.vm
    ctx.params = {}
    if (method !== req.method) {
      req.method = method
    }
    if (path !== req.path) {
      req.path = path
    }
    if (query !== req.query) {
      req.query = query
    }
    if (body !== req.body) {
      req.body = body
    }

    let index = -1
    let dispatch = function () {
      index++
      let fn = middlewares[index]
      if (!fn) {
        return Promise.resolve(next())
      }
      if (typeof fn === 'function') {
        return Promise.resolve(fn(ctx, dispatch))
      }
      if (fn.matches) {
        let matches = fn.matches.slice(1)
        for (let i = 0; i < matches.length; i++) {
          if (fn.route.paramNames[i]) {
            ctx.params[fn.route.paramNames[i].name] = matches[i] ? decodeURIComponent(matches[i]) : matches[i]
          }
        }
        return dispatch()
      }
      return dispatch()
    }

    let state
    try {
      await dispatch()
    } catch (e) {
      throw e
    } finally {
      state = ctx.state.vm
      ctx.params = reqState.params
      ctx.state.vm = reqState.vmState
      if (req.method !== reqState.method) {
        req.method = reqState.method
      }
      if (req.path !== reqState.path) {
        req.path = reqState.path
      }
      if (req.query !== reqState.query) {
        req.query = reqState.query
      }
      if (req.body !== reqState.body) {
        req.body = reqState.body
      }
    }
    return state
  }


  middleware = async (ctx: Context, next: () => Promise<void>): Promise<void> => {
    let req = ctx.request
    let isNext: boolean = false
    let state = await this.match(ctx, req.method, req.path, req.query, req.body, () => { isNext = true })

    if (isNext) {
      await next()
      return
    }

    if (state && !ctx.body && typeof ctx.body !== 'string') {
      ctx.type = 'json'
      ctx.set('X-Content-Type-Options', 'nosniff')
      ctx.body = JSON.stringify(state)
    }
  }


  all(...middleware: Middlewares) {
    return this.register({
      middleware,
    })
  }

  get(...middleware: Middlewares) {
    return this.register({
      methods: ['GET', 'HEAD'],
      middleware,
    })
  }

  post(...middleware: Middlewares) {
    return this.register({
      methods: ['POST'],
      middleware,
    })
  }

  put(...middleware: Middlewares) {
    return this.register({
      methods: ['PUT'],
      middleware,
    })
  }

  patch(...middleware: Middlewares) {
    return this.register({
      methods: ['PATCH'],
      middleware,
    })
  }

  del(...middleware: Middlewares) {
    return this.register({
      methods: ['DELETE'],
      middleware,
    })
  }

  options(...middleware: Middlewares) {
    return this.register({
      methods: ['OPTIONS'],
      middleware,
    })
  }

  opt(...middleware: Middlewares) {
    return this.register({
      methods: ['OPTIONS'],
      middleware,
    })
  }

  use(...middleware: Middlewares) {
    return this.register({
      use: true,
      end: false,
      middleware,
    })
  }

  register(opts: {
      middleware: Middlewares,
      methods?: string[],
      path?: string | RegExp | Array<string | RegExp>,
      name?: string,
    } = {
      methods: [],
      middleware: []
    }) {
    let path = opts.middleware[0]
    if (typeof opts.path === 'string') {
      opts.name = opts.path
    }
    if (typeof path === 'string' || path instanceof RegExp || Array.isArray(path)) {
      opts.path = path
      opts.middleware.shift()
    }

    // 覆盖 options
    let newOpts = opts.middleware[opts.middleware.length - 1]
    if (!(newOpts instanceof Router) && !Array.isArray(newOpts) && typeof newOpts !== 'function' && typeof newOpts === 'object') {
      opts.middleware.pop()
      // $flow-disable-line
      Object.assign(opts, newOpts)
    }

    if (Array.isArray(opts.path)) {
      opts.path.forEach(value => {
        this.register({ ...opts, path: value })
      })
    } else {
      this.stack.push(new Route(opts))
    }
    return this
  }
}


class Route {

  methods: string[] = []

  paramNames: Array<Object> = []

  middleware: Array<Middleware | Route> = []

  regexp: ?RegExp

  constructor(opts: Object = {}): void {
    for (let key in opts) {
      if (opts[key] !== null && opts[key] !== undefined) {
        // $flow-disable-line
        this[key] = opts[key]
      }
    }
    if (this.path) {
      this.paramNames = []
      this.regexp = pathToRegExp(this.path, this.paramNames, opts)
    }
  }
}
