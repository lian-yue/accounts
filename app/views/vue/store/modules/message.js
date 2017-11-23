/* @flow */
import Vue from 'vue'
import { MESSAGE, MESSAGE_CLEAR } from '../types'
export default {
  state: {},
  mutations: {
    [MESSAGE](state: Object, option: Object) {
      let name: string = option.name || option.key || option.id || ''
      let message = option.state || option.messages || option.message || option.data || option.error

      if (!message) {
        message = { message: '' }
      } else if (message instanceof Error) {
        message = { ...message, name: message.name, message: message.message }
      } else if (message instanceof Array) {
        message = { messages: message }
      } else if (message instanceof Object) {
        message = { ...message }
      } else {
        message = { message: String(message) }
      }

      if (!(message instanceof Object)) {
        message = { message: String(message) }
      } else if (!message.messages) {
        message.messages = [{ ...message }]
      } else if (message.messages instanceof Object) {
        let messages = []
        for (let key in message.messages) {
          let value = message.messages[key]
          if (value instanceof Error) {
            value = { ...value, name: value.name, message: value.message }
          } else if (value instanceof Object) {
            // object
          } else {
            value = { message: String(value) }
          }
          messages.push(value)
        }
      } else {
        message.messages = [{ ...message }]
      }
      // $flow-disable-line
      message.type = option.messageType || option.message_type || message.type
      Vue.set(state, name, message)
    },
    [MESSAGE_CLEAR](state: Object, option: Object) {
      let name: string = option.name || option.key || option.id || ''
      Vue.delete(state, name)
    },
  }
}
