/* @flow */
import querystring from 'querystring'

import createError from '../../createError'

import { qq as config } from 'config/oauth'

import Api from './api'


config.clientId = config.clientId || config.client_id || config.appkey || config.app_key
config.clientSecret = config.clientSecret || config.client_secret || config.appSecret || config.app_secret || config.secretKey || config.secret_key
config.scope = config.scope || config.scopes
if (!(config.scope instanceof Array)) {
  config.scope = config.scope.split(/[|, ]/)
}


export default class QQ extends Api {

  baseUri: string = 'https://graph.qq.com'

  accessTokenPath: string = '/oauth2.0/token'

  authorizePath: string = '/oauth2.0/authorize'

  name: string = config.name

  constructor(clientId: string = config.clientId, clientSecret: string = config.clientSecret) {
    super(clientId, clientSecret)
    this.setScope(config.scope)
    if (config.redirectUri) {
      this.setRedirectUri(config.redirectUri)
    }
  }



  async getUserInfo(): Promise<Object> {
    if (this.userInfo) {
      return this.userInfo
    }
    let userInfo = await this.api('GET', '/user/get_user_info')
    let result = {}

    const columns = {
      userid: 'id',
      domain: 'username',
      username: 'nickname',
      userdetail: 'description',
      portrait: 'avatar',
      birthday: 'birthday',
      sex: 'gender',
      lang: 'locale',
    }


    for (let column in columns) {
      let column2 = columns[column]
      if (userInfo[column]) {
        result[column2] = userInfo[column]
      }
    }
    if (result.gender) {
      switch (result.gender) {
        case '男':
        case '1':
          result.gender = 'male'
          break
        case '女':
        case '0':
          result.gender = 'female'
          break
        default:
          delete result.gender
      }
    }

    if (result.birthday && result.birthday === '0000-00-00') {
      delete result.birthday
    }
    if (result.avatar) {
      result.avatar = 'http://tb.himg.qq.com/sys/portrait/item/' + result.avatar
    }
    return this.filterUserInfo(result)
  }


  api(method: string, path: string, params: Object = {}, body: Object = {}, headers: Object = {}, args: Object = {}): Promise<Object> {
    if (!params.openid && !body.openid) {
      let accessToken = this.getAccessToken()
      if (!accessToken || !accessToken.openid) {
        throw createError(500, 'notexist', { path: 'openid' })
      }
      if (method === 'GET' || method === 'HEAD') {
        params.openid = accessToken.openid
      } else {
        body.openid = accessToken.openid
      }
    }
    return super.api(method, path, params, body, headers, args)
  }


  response(response: Object): Object {
    let body = response.body.trim().replace(/[\r\n\t ;]$/g, '')
    if (body.substr(0, 9) === 'callback(') {
      body = body.substr(9, -1).trim()
    }

    if (body.substr(0, 1) === '\u007B' || body.substr(0, 1) === '\u005B') {
      body = JSON.parse(body)
    } else {
      body = querystring.parse(body)
    }


    let message
    if (body.error_description) {
      message = body.error_description
    } else if (body.error) {
      message = isNaN(body.error) ? body.error : 'Error code ' + body.error
    } else if (body.ret) {
      message = body.msg ? body.msg : 'Error code ' + body.ret
    } else if (response.statusCode >= 400) {
      message = 'Error status code: ' + response.statusCode
    }

    if (message) {
      let status = 500
      let props = {}
      if (response.statusCode >= 400) {
        status = response.statusCode
      }
      if (body.error) {
        props.code = body.error
      }
      throw createError(status, message, props)
    }
    return body
  }
}
