/* @flow */
import 'es6-promise/auto'
import queryString from 'query-string'
import axios from 'axios'
import site from 'config/site'

import { TOKEN, SITE } from './store/types'
export async function init() {
  const createApp = require('./app').default
  const { store, router, locale, app } = createApp()

  store.fetch = async function (method: string, path: string, query: Object | string = {}, data?: any): Object {
    let opt: Object = {
      url: path,
      method,
      headers: {

      },
      timeout: 10000,
      validateStatus(status) {
        return status >= 100 && status < 600
      },
    }
    try {
      if (!data) {
        // empty
      } else if (typeof data === 'object') {
        if (!store.state.token._id) {
          await store.dispatch({
            type: TOKEN,
            save: true,
          })
        }
        opt.data = queryString.stringify(Object.assign({}, data, { format: 'json', csrf_token: store.state.token.id }))
      } else {
        opt.data = data
      }
      if (data) {
        opt.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }
      let queryObject: Object
      if (!query) {
        queryObject = {}
      } else if (typeof query === 'object') {
        queryObject = query
      } else {
        queryObject = queryString.parse(query)
      }
      let search: string = queryString.stringify(Object.assign({}, queryObject, method === 'HEAD' || method === 'GET' ? { format: 'json' } : {}))
      if (search) {
        search = '?' + search
      }
      opt.url += search

      let response = await axios(opt)
      if (response.status === 204) {
        response.data = {}
      }

      if (response.data.messages && response.data.properties) {
        let err = new Error
        for (let key in response.data) {
          // $flow-disable-line
          err[key] = response.data[key]
        }
        throw err
      }
      return response.data
    } catch (e) {
      delete e.type
      throw e
    }
  }

  if (window.__INITIAL_STATE__) {
    store.replaceState(window.__INITIAL_STATE__)
  } else {
    // 网站信息
    store.commit({
      type: SITE,
      value: {
        protocol: window.location.protocol ? window.location.protocol.substr(0, window.location.protocol.length - 1) : 'http',
        version: process.env.version,
        ...site,
      }
    })

    await store.dispatch({
      type: TOKEN,
    })
  }

  // 链接
  router.push(window.location.pathname + window.location.search + window.location.hash)

  // Locale
  await locale.changeLocale()

  router.onReady(() => {
    app.$mount('#app')
  })
}
init()
