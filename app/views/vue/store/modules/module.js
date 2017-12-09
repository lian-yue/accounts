/* @flow */
import Vue from 'vue'
import queryString from 'query-string'
import { MESSAGE } from '../types'

type OPTION = {
  state: Object,
  type: string,
  clearType?: string,
  path?: string,
  hash?: string,
  add?: boolean,
  key?: string,
  body?: any,
  data?: any,
  throw?: boolean,
  onState: (value: Object) => Object,
  onOption: (value: Object) => OPTION,
  onMessage: (value: Object) => Object,
  [string]: any,
}


function defaultOption(opts: Object): OPTION {
  return {
    state: {},
    onState(value: Object): Object {
      return value
    },
    onOption(value: Object): OPTION {
      return value
    },
    onMessage(value: Object): Object {
      return value
    },
    key: '',
    ...opts,
  }
}

export default function (_opt: Object): Object {
  let opt = defaultOption(_opt)

  const module = {
    state: { ...opt.state },
    mutations: {
      [opt.type](state: Object, option: { state?: Object, value?: Object }) {
        let newState = option.state || option.value || {}
        if (option.add) {
          if (newState.results && Array.isArray(newState.results) && state.results && Array.isArray(state.results)) {
            newState.results = [].concat(state.results, newState.results)
          }
        } else {
          newState = { ...opt.state, ...newState }
        }
        let keys = Object.keys(newState)
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i]
          if (state[key] !== newState[key]) {
            Vue.set(state, key, newState[key])
          }
        }

        if (!option.add) {
          for (let key in state) {
            if (keys.indexOf(key) === -1) {
              Vue.delete(state, key)
            }
          }
        }
      },
    },
    actions: {
      async [opt.type]({ commit, state, rootState }: { commit: Function, state: Object, rootState: Object }, _payload: Object) {
        let option = defaultOption(_payload)
        option = option.onOption(opt.onOption(option))
        let method: string = option.method || (option.body || option.data ? 'POST' : 'GET')
        let routeFullPath: string = rootState.route.fullPath
        let path: string = option.path || rootState.route.path
        let query: Object = option.query || rootState.route.query
        let fullPath: string = option.fullPath || rootState.route.fullPath || path + queryString.stringify(query)
        let oldFullPath: any = state.fullPath
        let key: string = __SERVER__ ? '' : Math.random().toString(36).substr(2)
        let oldKey = state.key || ''

        let add = option.add

        commit({
          type: opt.type,
          add,
          state: {
            key,
            fullPath,
            loading: true,
          },
        })

        let newState: Object
        try {
          newState = await this.fetch(method, path, query, option.body || option.data)
          newState = {
            ...option.state,
            ...newState
          }
          newState = option.onState(opt.onState(newState))
        } catch (e) {
          if (state.key === key && state.loading && routeFullPath === rootState.route.fullPath) {
            if (!opt.throw && !option.throw) {
              let message = option.onMessage(opt.onMessage({
                name: 'popup',
                type: MESSAGE,
                state: e,
              }))
              if (message) {
                commit(message)
              }
            }
            commit({
              type: opt.type,
              add: true,
              state: {
                fullPath: oldFullPath,
                key: oldKey,
                loading: false,
              }
            })
          }
          if (opt.throw || option.throw) {
            throw e
          }
          return
        }
        if (newState && state.key === key && state.loading) {
          commit({
            type: opt.type,
            add,
            state: {
              ...newState,
              fullPath,
              key,
              loading: false,
            }
          })
        }
      },
    }
  }

  // 清除
  if (opt.clearType) {
    module.mutations[opt.clearType] = function (state: Object, option) {
      let keys = Object.keys(opt.state)
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i]
        Vue.set(state, key, opt.state[key])
      }

      for (let key in state) {
        if (keys.indexOf(key) === -1) {
          Vue.delete(state, key)
        }
      }
    }
  }
  return module
}
