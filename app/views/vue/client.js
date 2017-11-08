/* @flow */
import 'es6-promise/auto'
import queryString from 'query-string'
import { TOKEN, MESSAGES } from './store/types'
export async function init() {
  if (!window.fetch) {
    await import('whatwg-fetch')
  }
  const createApp = require('./app').default
  const { store, router, locale, app } = createApp()

  store.commit.fetch = async function (method: string, path: string, query: Object | string = {}, body?: any): Object {
    let opt = {}
    opt.headers = {}
    opt.method = method

    let uri: string = path
    try {
      if (!body) {
        // empty
      } else if (typeof body === 'object') {
        if (!store.state.token._id) {
          await store.dispatch({
            type: TOKEN,
            save: true,
          })
        }
        opt.body = queryString.stringify(Object.assign({}, body, { format: 'json', csrf_token: store.state.token.id }))
        opt.headers['Content-Type'] = 'application/x-www-form-urlencoded'
      } else {
        opt.body = body
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
      uri += '?' + queryString.stringify(Object.assign({}, queryObject, body ? { format: 'json' } : {}))

      opt.credentials = opt.credentials || 'same-origin'
      opt.timeout = 10000

      let response = await fetch(uri, opt).then(function (res) {
        if (res.status === 204) {
          return {}
        }
        return res.json()
      })

      if (response.messages) {
        let err = new Error
        for (let key in response) {
          // $flow-disable-line
          err[key] = response[key]
        }
        throw err
      }
      return response
    } catch (e) {
      e._type = e.type
      e.type = MESSAGES
      delete e.name
      throw e
    }
  }


  //  读取 store
  if (window.__INITIAL_STATE__) {
    store.replaceState(window.__INITIAL_STATE__)
  }

  // Locale
  await locale.changeLocale()

  router.onReady(() => {
    app.$mount('#app')
  })
}
init()
