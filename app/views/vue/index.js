import { createBundleRenderer } from 'vue-server-renderer'
import cache from 'lru-cache'
import moment from 'moment'

moment.locale('zh-cn')

function createRenderer() {
  return createBundleRenderer(require('vue-ssr-bundle'), {
    template: require('./template')({}),
    cache: cache({
      max: 1000,
      maxAge: 1000 * 60 * 15
    }),
  })
}

var renderer = createRenderer()


export default async function(ctx, next) {
  if (['GET', 'HEAD'].indexOf(ctx.method) == -1 || ctx.path.split('/')[1] == 'oauth' || (ctx.query.format && ctx.query.format != 'vue' && ctx.query.format != 'vuejs')) {
    await next()
    return
  }


  try {
    var body = await new Promise(function(resolve, reject) {
      renderer.renderToString({url : ctx.url, ctx}, function(err, body) {
        if (err) {
          reject(err)
        } else {
          resolve(body)
        }
      })
    });
  } catch (err) {
    if (!(err instanceof Error)) {
      var e = new Error(err.message)
      e.stack = err.stack
      e.lineNumber = err.lineNumber
      e.fileName = err.fileName
      e.columnNumber = err.columnNumber
      if (err.name) {
        e.name = err.name
      }
      for (var key in err) {
        e[key] = err[key]
      }
      throw e
    }
    throw err
  }

  ctx.type = 'text/html'
  ctx.body = body
}


if(module.hot) {
  module.hot.accept(['vue-ssr-bundle', './template'], function() {
    renderer = createRenderer()
  });
}
