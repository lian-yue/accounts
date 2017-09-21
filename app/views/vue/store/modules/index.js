import module from './module'
import * as types from '../types'


const userList = module({
  type: types.USER_LIST,
  clearType: types.USER_READ_CLEAR,
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
  clearType: types.AUTH_READ_CLEAR,
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
  clearType: types.APPLICATION_READ_CLEAR,
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
  type: types.AUTHORIZEL_LIST,
  clearType: types.AUTHORIZEL_READ_CLEAR,
  state: {
    results: [],
    more: true,
  }
})

const authorizeRead = module({
  type: types.AUTHORIZEL_READ,
  clearType: types.AUTHORIZEL_READ_CLEAR,
  state: {
    roles: [],
    cans: {},
  }
})







const messageList = module({
  type: types.MESSAGE_LIST,
  clearType: types.MESSAGE_READ_CLEAR,
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
