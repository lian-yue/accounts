/* @flow */
import Vue from 'vue'
import * as types from '../types'

function toObject(data: Object): Object {
  if (data instanceof Error) {
    return toObject({ ...data, message: data.message })
  }

  for (let key in data) {
    if (data[key] && typeof data[key] === 'object') {
      data[key] = toObject(data[key])
    }
  }

  return data
}

export default {
  [types.MESSAGES](state: Object, payload: Object) {
    let message = toObject(payload)
    if (message.errors && !message.messages) {
      message.messages = message.errors
      delete message.errors
    }

    message.name = message.name || ''
    message.type = message._type
    delete message._type

    if (!message.messages) {
      message = { ...message, messages: [message] }
    }

    Vue.set(state.messages, message.name, message)
  },

  [types.MESSAGES_CLOSE](state: Object, { name = '' }: { name: string }) {
    if (state.messages[name] && !state.messages[name].close) {
      Vue.set(state.messages[name], 'close', true)
    }
  },

  [types.PROTOCOL](state: Object, { protocol }: { protocol: string }) {
    state.protocol = protocol || 'http'
  },
}
