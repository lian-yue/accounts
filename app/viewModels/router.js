import http        from 'http'
import pathToRegExp from 'path-to-regexp'
import queryString from 'query-string'

const debug = require('debug')('vm:router');

export default class Router {

  stack = []

  allowMethods = ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE']


  constructor(opts) {

  }

  methodMiddlewares(method, path) {
    var middlewares = []

    var route
    var middleware
    var isBreak
    for (var i = 0; i < this.stack.length; i++) {
      route = this.stack[i]
      if (route.methods.length && route.methods.indexOf(method) == -1) {
        continue
      }
      var matches
      if (route.regexp && !(matches = path.match(route.regexp))) {
        continue
      }
      middlewares.push({
        route,
        matches,
      })
      for (var ii = 0; ii < route.middleware.length; ii++) {
        middleware = route.middleware[ii]
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

  async match(ctx, method, path, query, body, next) {
    method = method || 'GET'
    query = query || {}
    path = path || '/'
    next = next || function() {}
    if (typeof query == 'string') {
      query = queryString.parse(query)
    }
    method = method || 'GET'
    query = query || {}
    path = path || '/'
    next = next || function() {}
    if (typeof query == 'string') {
      query = queryString.parse(query)
    }

    if (this.allowMethods.indexOf(method) == -1) {
      ctx.throw(http.STATUS_CODES[405], 405);
    }

    var middlewares = this.methodMiddlewares(method, path)
    var is404 = true
    for (var i = 0; i < middlewares.length; i++) {
      var middleware = middlewares[i]
      if (typeof middleware == 'object' && middleware.route && !middleware.route.use) {
        is404 = false
        break
      }
    }

    if (is404) {
      return next()
    }




    var req = ctx.request

    debug('%s %s', method, path);
    var reqState = {
      params: ctx.params || {},
      method: req.method,
      path: req.path,
      query: req.query,
      body: req.body,
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




    var index = -1
    var dispatch = function () {
      index++
      var fn = middlewares[index]
      if (!fn) {
        return Promise.resolve(next())
      }
      if (typeof fn == 'object') {
        if (fn.matches) {
          var matches = fn.matches.slice(1)
          for (let i = 0; i < matches.length; i++) {
            if (fn.route.paramNames[i]) {
              ctx.params[fn.route.paramNames[i].name] = matches[i] ? decodeURIComponent(matches[i]) : matches[i];
            }
          }
        }
        return dispatch()
      }
      return Promise.resolve(fn(ctx, dispatch))
    }

    try {
      await dispatch()
    } catch (e) {
      throw e
    } finally {
      var state = ctx.state.vm
      ctx.params = reqState.params
      ctx.state.vm = reqState.state
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


  middleware = async (ctx, next) => {
    var req = ctx.request
    var isNext = false
    var state = await this.match(ctx, req.method, req.path, req.query, req.body, function() {
      isNext = true
    })

    if (isNext) {
      await next()
      return
    }

    if (state && !ctx.body && typeof ctx.body != 'string') {
      ctx.type = 'json'
      ctx.set("X-Content-Type-Options", 'nosniff')
      ctx.body = JSON.stringify(state)
    }
  }


  all(...middleware) {
    return this.register({
      middleware,
    })
  }

  get(...middleware) {
    return this.register({
      methods: ['GET', 'HEAD'],
      middleware,
    })
  }

  post(...middleware) {
    return this.register({
      methods: ['POST'],
      middleware,
    })
  }

  put(...middleware) {
    return this.register({
      methods: ['PUT'],
      middleware,
    })
  }

  patch(...middleware) {
    return this.register({
      methods: ['PATCH'],
      middleware,
    })
  }

  del(...middleware) {
    return this.register({
      methods: ['DELETE'],
      middleware,
    })
  }

  options(...middleware) {
    return this.register({
      methods: ['OPTIONS'],
      middleware,
    })
  }

  opt(...middleware) {
    return this.register({
      methods: ['OPTIONS'],
      middleware,
    })
  }

  use(...middleware) {
    return this.register({
      use: true,
      end: false,
      middleware,
    })
  }

  register(opts) {
    if (typeof opts.middleware[0] == 'string' || opts.middleware[0] instanceof RegExp || Array.isArray(opts.middleware[0])) {
      var path = opts.middleware.shift()
      opts.name = opts.path
      opts.path = path
    }

    // options
    if (opts.middleware.length && typeof opts.middleware[opts.middleware.length - 1] == 'object' && opts.middleware[opts.middleware.length - 1].constructor == Object) {
      var newOpts = opts.middleware[opts.middleware.length - 1]
      if (newOpts && typeof newOpts == 'object' && (!newOpts.constructor || newOpts.constructor == Object)) {
        opts.middleware.pop()
      }
      Object.assign(opts, newOpts)
    }
    
    if (Array.isArray(opts.path)) {
      opts.path.forEach((path) => {
        this.register(Object.assign({}, opts, {path}));
      });
    } else {
      this.stack.push(new Route(opts))
    }
    return this
  }
}


class Route {

  methods = []

  paramNames = []

  middleware = []

  constructor(opts) {
    opts = opts || {}
    for (var key in opts) {
      if (opts[key]) {
        this[key] = opts[key]
      }
    }
    this.middleware = Array.isArray(this.middleware) ? this.middleware : [this.middleware];
    if (this.path) {
      this.regexp = pathToRegExp(this.path, this.paramNames, opts);
    }
  }
}


if (module.hot) {
  module.hot.accept();
}
