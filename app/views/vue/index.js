/* @flow */
import { createBundleRenderer } from 'vue-server-renderer'

import cache from 'lru-cache'

import type { Context } from 'koa'

function createRenderer() {
  // $flow-disable-line
  return createBundleRenderer(require('vue-ssr-bundle'), {
    template: require('./template.ejs')({}),
    runInNewContext: false,
    cache: cache({
      max: 1000,
      maxAge: 1000 * 60 * 15
    }),
  })
}

let renderer = createRenderer()

export default async function (ctx: Context, next: () => Promise<void>): Promise<void> {
  if (['GET', 'HEAD'].indexOf(ctx.method) === -1 || ctx.path.substr(0, 6) === '/oauth' || (ctx.query.format && ctx.query.format !== 'vue' && ctx.query.format !== 'vuejs')) {
    await next()
    return
  }

  let body: string
  try {
    body = await new Promise(function (resolve, reject) {
      renderer.renderToString({ url: ctx.url, context: ctx }, function (err, res) {
        err ? reject(err) : resolve(res)
      })
    })
  } catch (err) {
    if (err instanceof Error) {
      throw err
    }
    let e = new Error(err.message)
    e.stack = err.stack
    e.lineNumber = err.lineNumber
    e.fileName = err.fileName
    e.columnNumber = err.columnNumber
    if (err.name) {
      e.name = err.name
    }
    for (let key in err) {
      // $flow-disable-line
      e[key] = err[key]
    }
    throw e
  }
  ctx.type = 'text/html'
  ctx.body = body
}
if (module.hot) {
  module.hot.accept(['vue-ssr-bundle', './template'], function () {
    renderer = createRenderer()
  })
}
