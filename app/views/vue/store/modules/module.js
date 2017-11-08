/* @flow */
import Vue from 'vue'
import queryString from 'query-string'
import { MESSAGES } from '../types'

type OPTION = {
  state: Object,
  type: string,
  clearType?: string,
  path?: string,
  hash?: string,
  add?: boolean,
  key?: string,
  body?: any,
  onState: (value: Object) => Object,
  onOption: (value: Object) => OPTION,
  onMessages: (value: Object) => Object,
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
    onMessages(value: Object): Object {
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
      [opt.type](state: Object, option: { state: Object }) {
        let newState = option.state
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
        option = option.onState(opt.onOption(option))
        let method: string = option.method || (option.body ? 'POST' : 'GET')
        let fullPath: string = rootState.route.fullPath
        let path: string = option.path || rootState.route.path
        let query: Object = option.query || rootState.route.path
        let key: string = method === 'GET' ? path + queryString.stringify(query) : ''
        let oldKey: string = state.key || ''
        let uuid: string = __SERVER__ ? '' : Math.random().toString(36).substr(2)
        let oldUuid = state.uuid || ''

        let add = option.add

        commit({
          type: opt.type,
          add,
          state: {
            uuid,
            key,
            loading: true,
          },
        })

        let newState: Object
        try {
          newState = await commit.fetch(method, path, query, option.body)
          newState = {
            ...option.state,
            ...newState
          }
          newState = option.onState(opt.onState(newState))
        } catch (e) {
          if (state.uuid === uuid && state.loading && fullPath === rootState.route.fullPath) {
            let message = option.onMessages(opt.onMessages({
              ...e,
              name: 'popup',
              type: MESSAGES,
              message: e.message,
            }))
            if (message) {
              commit(message)
            }
            commit({
              type: opt.type,
              add: true,
              state: {
                key: oldKey,
                uuid: oldUuid,
                loading: false,
              }
            })
          }
          return
        }
        if (newState && state.uuid === uuid && state.loading) {
          commit({
            type: opt.type,
            add,
            state: {
              ...newState,
              key,
              uuid,
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
