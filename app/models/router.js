/* @flow */
import pathToRegExp from 'path-to-regexp'
import queryString from 'query-string'

const debug = require('debug')('vm:router')

export default class Router {

  stack: Array<Route> = []

  allowMethods: string[] = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE']


  methodMiddlewares(method: string, path: string) {
    let middlewares: any[] = []

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

  async match(ctx: Object, method: string = 'GET', path: string = '/', _query: Object | string = {}, body?: any, next: Function = () => {}) {
    let query = _query
    if (typeof query === 'string') {
      query = queryString.parse(query)
    }

    if (this.allowMethods.indexOf(method) === -1) {
      ctx.throw(405)
    }

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
      return next()
    }


    let req = ctx.request

    debug('%s %s', method, path)
    let reqState = {
      params: ctx.params || {},
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
      vmState: req.vmState,
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
      if (typeof fn === 'object') {
        if (fn.matches) {
          let matches = fn.matches.slice(1)
          for (let i = 0; i < matches.length; i++) {
            if (fn.route.paramNames[i]) {
              ctx.params[fn.route.paramNames[i].name] = matches[i] ? decodeURIComponent(matches[i]) : matches[i]
            }
          }
        }
        return dispatch()
      }
      return Promise.resolve(fn(ctx, dispatch))
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


  middleware = async (ctx: Object, next: Function) => {
    let req = ctx.request
    let isNext = false
    let state = await this.match(ctx, req.method, req.path, req.query, req.body, function () {
      isNext = true
    })

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


  all(...middleware: any[]) {
    return this.register({
      middleware,
    })
  }

  get(...middleware: any[]) {
    return this.register({
      methods: ['GET', 'HEAD'],
      middleware,
    })
  }

  post(...middleware: any[]) {
    return this.register({
      methods: ['POST'],
      middleware,
    })
  }

  put(...middleware: any[]) {
    return this.register({
      methods: ['PUT'],
      middleware,
    })
  }

  patch(...middleware: any[]) {
    return this.register({
      methods: ['PATCH'],
      middleware,
    })
  }

  del(...middleware: any[]) {
    return this.register({
      methods: ['DELETE'],
      middleware,
    })
  }

  options(...middleware: any[]) {
    return this.register({
      methods: ['OPTIONS'],
      middleware,
    })
  }

  opt(...middleware: any[]) {
    return this.register({
      methods: ['OPTIONS'],
      middleware,
    })
  }

  use(...middleware: any[]) {
    return this.register({
      use: true,
      end: false,
      middleware,
    })
  }

  register(opts: Object = {}) {
    if (typeof opts.middleware[0] === 'string' || opts.middleware[0] instanceof RegExp || Array.isArray(opts.middleware[0])) {
      let path = opts.middleware.shift()
      opts.name = opts.path
      opts.path = path
    }

    // options
    if (opts.middleware.length && typeof opts.middleware[opts.middleware.length - 1] === 'object' && opts.middleware[opts.middleware.length - 1].constructor === Object) {
      let newOpts = opts.middleware[opts.middleware.length - 1]
      if (newOpts && typeof newOpts === 'object' && (!newOpts.constructor || newOpts.constructor === Object)) {
        opts.middleware.pop()
      }
      Object.assign(opts, newOpts)
    }

    if (Array.isArray(opts.path)) {
      opts.path.forEach((path) => {
        this.register(Object.assign({}, opts, {path}))
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

  middleware: Array<Route | Function> = []

  regexp: ?RegExp

  constructor(opts: Object = {}) {
    for (let key in opts) {
      if (opts[key] !== null && opts[key] !== undefined) {
        // $flow-disable-line
        this[key] = opts[key]
      }
    }

    this.middleware = Array.isArray(this.middleware) ? this.middleware : [this.middleware]
    if (this.path) {
      this.paramNames = []
      this.regexp = pathToRegExp(this.path, this.paramNames, opts)
    }
  }
}
