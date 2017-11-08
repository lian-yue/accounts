/* @flow */
import module from './module'
import * as types from '../types'


const token = module({
  type: types.TOKEN,
  clearType: types.TOKEN_CLEAR,
  onOption(option: Object) {
    option.path = '/token/me'
    option.query = option.query || {
      save: option.save,
    }
    return option
  },
  state: {
  }
})

const userList = module({
  type: types.USER_LIST,
  clearType: types.USER_LIST_CLEAR,
  state: {
    results: [],
    more: true,
  }
})

const userRead = module({
  type: types.USER_READ,
  clearType: types.USER_READ_CLEAR,
  state: {
    meta: {},
    auths: [],
    cans: {},
  }
})




const authList = module({
  type: types.AUTH_LIST,
  clearType: types.AUTH_LIST_CLEAR,
  state: {
    results: [],
    more: true,
  }
})

const authRead = module({
  type: types.AUTH_READ,
  clearType: types.AUTH_READ_CLEAR,
  state: {
    settings: {},
    cans: {},
  }
})




const applicationList = module({
  type: types.APPLICATION_LIST,
  clearType: types.APPLICATION_LIST_CLEAR,
  state: {
    results: [],
    more: true,
  }
})

const applicationRead = module({
  type: types.APPLICATION_READ,
  clearType: types.APPLICATION_READ_CLEAR,
  state: {
    requestOrigins: [],
    redirectUris: [],
    allowedIps: [],
    scopes: [],
    auths: {},
    cans: {},
  }
})




const authorizeList = module({
  type: types.AUTHORIZE_LIST,
  clearType: types.AUTHORIZE_LIST_CLEAR,
  state: {
    results: [],
    more: true,
  }
})

const authorizeRead = module({
  type: types.AUTHORIZE_READ,
  clearType: types.AUTHORIZE_READ_CLEAR,
  state: {
    roles: [],
    cans: {},
  }
})




const messageList = module({
  type: types.MESSAGE_LIST,
  clearType: types.MESSAGE_LIST_CLEAR,
  state: {
    results: [],
    more: true,
  }
})

const messageRead = module({
  type: types.MESSAGE_READ,
  clearType: types.MESSAGE_READ_CLEAR,
  state: {
    cans: {},
  }
})




export {
  token,
  userList,
  userRead,
  authList,
  authRead,
  applicationList,
  applicationRead,
  authorizeList,
  authorizeRead,
  messageList,
  messageRead,
}
