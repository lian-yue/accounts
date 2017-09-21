import Vue from 'vue'
import queryString from 'query-string'
import { MESSAGES } from '../types'


function defaultOption(option) {
  return {
    state: {},
    onState(state) {
      return state
    },
    onLoad(payload) {
      return payload
    },
    onMessages(messages) {
      return messages
    },
    ...option,
  }
}

export default function (opt) {
  opt = defaultOption(opt)
  const module = {
    state: {...opt.state},
    mutations: {
      [opt.type](state, payload) {
        var newState = payload.state
        if (payload.add) {
          if (newState.results && Array.isArray(newState.results) && state.results && Array.isArray(state.results)) {
            newState.results = [].concat(state.results, newState.results)
          }
        } else {
          newState = {...opt.state, ...newState}
        }
        var keys = Object.keys(newState)
        var key
        for (var i = 0; i < keys.length; i++) {
          key = keys[i]
          if (state[key] !== newState[key]) {
            Vue.set(state, key, newState[key])
          }
        }

        if (!payload.add) {
          for (var key in state) {
            if (keys.indexOf(key) == -1) {
              Vue.delete(state, key)
            }
          }
        }
      },
    },
    actions: {
      async [opt.type]({commit, state, rootState}, payload) {
        payload = defaultOption(payload)
        payload = payload.onLoad(opt.onLoad(payload))
        var routeFullPath = rootState.route.fullPath
        var key = __SERVER__ ? null : Math.random().toString(36).substr(2)
        var fullPath = payload.fullPath
        if (!fullPath) {
          let query = payload.query ? queryString.stringify(payload.query) : ''
          fullPath = payload.path + (query ? '?' + query : '')
        }
        var add = payload.add

        var oldKey = state.key || ''
        commit({
          type: opt.type,
          add,
          state: {
            key,
            loading: true,
          },
        })
        try {
          var newState = await commit.fetch(payload.path, payload.query, payload.body)
          newState = {
            ...payload.state,
            ...newState
          }
          newState = payload.onState(opt.onState(newState))
        } catch (e) {
          if (state.key == key && state.loading && routeFullPath == rootState.route.fullPath) {
            let message = payload.onMessages(opt.onMessages({
              ...e,
              name: 'popup',
              type: MESSAGES,
              message: e.message
            }))
            if (message) {
              commit(message)
            }
            commit({
              type: opt.type,
              add: true,
              state: {
                key: oldKey,
                loading: false,
              }
            })
          }
          return
        }
        if (newState && state.key == key && state.loading) {
          commit({
            type: opt.type,
            add,
            state: {
              ...newState,
              key,
              loading: false,
              fullPath,
            }
          })
        }
      },
    }
  }
  if (opt.clearType) {
    module.mutations[opt.clearType] = function(state, payload) {
      var keys = Object.keys(opt.state)
      var key
      for (var i = 0; i < keys.length; i++) {
        key = keys[i]
        Vue.set(state, key, opt.state[key])
      }

      for (var key in state) {
        if (keys.indexOf(key) == -1) {
          Vue.delete(state, key)
        }
      }
    }
  }
  return module
}
