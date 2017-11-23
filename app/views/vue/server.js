/* @flow */
import site from 'config/site'
import createError from 'models/createError'

import createApp from './app'
import { SITE, TOKEN } from './store/types'

import type { Context } from 'koa'


export default async function (context: Object) {
  const { store, router, locale, app } = createApp()
  const ctx: Context = context.context


  store.fetch = async function (method: string, path: string, query: Object | string = {}, body?: any): Object {
    try {
      return await ctx.viewModel(method, path, query, body).then(state => toJSONObject(state))
    } catch (e) {
      let err = createError(e)
      ctx.app.emit('error', err, ctx)
      // $flow-disable-line
      delete err.type
      throw err
    }
  }

  // 链接
  router.push(ctx.url)

  // 协议
  store.commit({
    type: SITE,
    value: {
      protocol: ctx.protocol,
      version: process.env.version,
      ...site,
    }
  })

  // token
  await store.dispatch({
    type: TOKEN,
  })

  // Locale
  await locale.changeLocale()

  await new Promise(function (resolve, reject) {
    router.onReady(function () {
      const matchedComponents = router.getMatchedComponents()
      if (!matchedComponents.length) {
        return reject(createError(404, 'notexist', { path: 'router' }))
      }

      Promise.all(matchedComponents.map(function (component) {
        if (!component.fetch) {
          return
        }
        return component.fetch(store)
      })).then(function () {
        resolve(app)
      }).catch(reject)
    })
  })


  context.state = store.state

  context.htmlattrs = context.htmlattrs || ''
  context.title = context.title || ''

  return app
}



function toJSONObject(state: Object): Object {
  for (let key in state) {
    let value = state[key]
    if (!value) {
      continue
    }
    if (typeof value !== 'object') {
      continue
    }
    if (typeof value.toJSON === 'function') {
      value = value.toJSON()
    } else {
      value = toJSONObject({ ...value })
    }
    state[key] = value
  }
  return state
}
