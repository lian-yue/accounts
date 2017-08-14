import path        from 'path'
import http        from 'http'
import assert      from 'assert'
import Koa         from 'koa'
import koaStatic   from 'koa-static'
import moment      from 'moment'

import 'source-map-support/register'

import packageInfo from 'package'

global.__SERVER__ = true

var models = require('models').default
var viewModels = require('viewModels').default

if (module.hot) {
  module.hot.accept(['models', 'viewModels'], function() {
    models = require('models').default
    viewModels = require('viewModels').default
  })
}


// Add http 451
http.STATUS_CODES[451] = 'Unavailable For Legal Reasons'

export default function() {

  const app = new Koa()

  app.env = process.env.NODE_ENV || 'production'

  // error
  app.context.onerror = function(err, ret) {
    if (null === err) {
      return;
    }

    assert(err instanceof Error, 'non-error thrown: ' + err);
    const ctx = this;

    // ENOENT support
    if ('ENOENT' === err.code) {
      err.status = 404;
    }

    if (err.status == 400 && err.statusCode > 400 && err.statusCode < 500) {
      err.status = err.status;
    }

    if ((err.code == 'HPE_INVALID_EOF_STATE' || err.code == 'ECONNRESET' || err.message == 'Request aborted') && !err.status) {
      err.status = 408;
    }

    if (err.name == 'ValidationError' || err.name == 'ValidatorError') {
      err.status = err.status || 403;
      err.code = err.name;
    }

    if (err.code == 'ValidationError' || err.code == 'ValidatorError') {
      err.status = err.status || 403;
    }

    if ('number' !== typeof err.status || !http.STATUS_CODES[err.status]) {
      err.status = 500;
    }

    if (!ctx.status || ctx.status < 300 || ctx.status == 404 || err.status >= 500) {
      ctx.status = err.status;
    } else {
      err.status = ctx.status
    }

    ctx.app.emit('error', err, ctx);

    if (err.status == 408) {
      return;
    }

    if (ctx.headerSent || !ctx.writable) {
      err.headerSent = true;
      return;
    }

    if ((err.status == 500 && app.env != 'development') || !err.message) {
      err.message = http.STATUS_CODES[err.status]
    }

    if (err.headers) {
      ctx.set(err.headers)
      delete err.headers
    }

    var messages = [];
    if (err.name == 'ValidationError' && err.errors) {
      for (let path in err.errors) {
        let message = err.errors[path];
        messages.push({
          code: message.code || message.name,
          path: message.path || path,
          message: message.message,
          ...message,
        });
      }
      delete err.errors
    } else {
      messages.push({
        message: err.message,
        ...err,
      });
    }
    err.messages = messages

    if (!ret) {
      ctx.type = 'json'
      ctx.res.end(JSON.stringify({message: err.message, error: err.message, name: err.name, status: err.status, ...err}));
      return
    }
    return err
  };


  app.context.vmState = function(state, status) {
    this.state.vm = this.state.vm || {}
    if (status) {
      ctx.status = status
    }
    if (state) {
      if (typeof state.toJSON == 'function') {
        state = state.toJSON();
      }
      Object.assign(this.state.vm, state)
    }
    return this.state.vm
  }

  app.context.versionCompare = function(value) {
    var version
    if (this.query.version) {
      version = this.query.version
    } else if (this.request.body instanceof Object && this.request.body.version) {
      version = this.request.body.version
    } else if (this.request.body instanceof Object && this.request.body.fields instanceof Object && this.request.body.fields.version) {
      version = this.request.body.fields.version
    }

    if (!version && typeof version != 'string') {
      return true
    }


    version = version.split('.').map(value => parseInt(value))
    value = value.split('.').map(value => parseInt(value))

    for (var i = 0; i < value.length; i++) {
      if (value[i] > (version[i] || 0)) {
        return false
      }
    }
    return true
  }

  app.context.viewModel = function(method, path, query, body) {
    return viewModels.match(this, method, path, query, body);
  }


  // public file
  app.use(koaStatic(path.join(__dirname, '../public')));




  // access log
  app.use(async function(ctx, next) {
    var start = new Date;
    await next()
    var ms = new Date - start;
    var userAgent = ctx.request.header['user-agent'] || '';
    console.log(`${ctx.method} ${ctx.status} ${ctx.url} - ${moment(start).format('YYYY-MM-DD hh:mm:ss')} - ${ms}ms - ${ctx.request.ip} - ${userAgent}`);
    ctx.set('X-Response-Time', ms + 'ms');
    ctx.set('X-Version', packageInfo.version);
    ctx.set('X-Author', packageInfo.author);
  });



  // timeout
  app.use(async function(ctx, next) {
    var clear = setTimeout(function() {
      clear = null
      var err = new Error('Request timeout');
      err.status = 502;
      ctx.onerror(err);
    }, 60000);

    try {
      await next()
    } catch (e) {
      throw e
    } finally {
      clearTimeout(clear);
      clear = null
    }
  })

  // headers
  app.use(async function(ctx, next) {
    ctx.set("X-Content-Type-Options", 'nosniff')
    ctx.set('X-Frame-Options', 'SAMEORIGIN')
    await next()
  })

  // views  viewModels
  if (process.env.NODE_ENV == 'development') {
    // delay
    app.use(async function(ctx, next) {
      // await new Promise(function(resolve, reject) {
      //   setTimeout(function() {
      //     resolve()
      //   }, 200 + parseInt(Math.random() * 800));
      // });
      await next()
    })

    // app.use(function(ctx, next) {
    //   return require('views/vue').default(ctx, next)
    // });
    app.use(function(ctx, next) {
      return viewModels.middleware(ctx, next)
    });
  } else {
    // app.use(require('views/vue').default);
    app.use(viewModels.middleware);
  }

  // 404
  app.use(async function(ctx) {
    ctx.throw(404, http.STATUS_CODES[404]);
  })

  // 错误捕获
  app.on('error', function(err, ctx) {
    var date = moment().format('YYYY-MM-DD hh:mm:ss')
    if (err.status || !err.status >= 500) {
      console.error(date, 'server error :', err, ctx);
    } else {
      console.warn(`${ctx.method} ${ctx.status} ${ctx.url} - ${date} - ${ctx.request.ip} - ${err.message}`);
    }
  });
  return app
}
