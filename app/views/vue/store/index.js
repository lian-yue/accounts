/* @flow */
import Vue from 'vue'
import Vuex from 'vuex'

import * as modules from './modules'


Vue.use(Vuex)

export default function createStore(state: Object = {}): Vuex.Store {
  const plugins = []
  if (process.env.NODE_ENV === 'development') {
    plugins.push(function (store) {
      store.subscribe(function (mutation) {
        if (__SERVER__) {
          const debug = require('debug')('vue:vuex')
          debug('%s  %s', mutation.type, JSON.stringify(mutation.payload, null, '  '))
        } else {
          console.log(mutation.type, mutation.payload)
        }
      })
    })
  }

  return new Vuex.Store({
    state,
    modules,
    plugins,
    strict: process.env.NODE_ENV === 'development',
  })
}
