import ES6Promise from 'es6-promise/auto'
import moment from 'moment'
import queryString from 'query-string'

import { TOKEN, MESSAGES } from './store/types'

moment.locale('zh-cn');

module.exports = async function() {
  if (!window.fetch) {
    await import("whatwg-fetch")
  }
  const {app, store, router} = require('./app')

  if (window.__INITIAL_STATE__) {
    store.replaceState(window.__INITIAL_STATE__)
  }

  // 登录判断
  router.beforeEach(function(to, from, next) {
    if (to.meta.login && !store.state.token.user) {
      next({
        path: '/auth/login',
        query: {message: 'not_logged', redirect_uri: to.fullPath}
      })
    } else {
      next()
    }
  })


  store.commit.fetch = async function (path, query, body) {
    var opt = {}
    opt.headers = {}

    try {
      if (body && typeof body == 'object') {
        if (!store.state.token._id) {
          await store.dispatch({
            type: TOKEN,
            create: 1,
          })
        }
        body = queryString.stringify(Object.assign({}, body, {format: 'json', csrf_token: store.state.token._id}))
      }

      if (query && typeof query == 'object') {
        query = queryString.stringify(body ? query : Object.assign({}, query, {format : 'json'}))
      }

      if (body) {
        opt.method = 'POST'
        opt.headers['Content-Type'] = "application/x-www-form-urlencoded"
      }

      if (body) {
        opt.body = body
      }
      opt.credentials = opt.credentials || 'same-origin'
      opt.timeout = 10000

      var response = await fetch(path + (query ? '?' + query : ''), opt).then((response) => {
        if (response.status == 204) {
          return {}
        }
        return response.json(true)
      })
      if (response.messages) {
        var err = new Error
        for (var key in response) {
          err[key] = response[key]
        }
        throw err
      }
      return response
    } catch (e) {
      e.type = MESSAGES
      delete e.name
      throw e
    }
  }

  router.onReady(() => {
    app.$mount('#app')
  })
}
module.exports()
