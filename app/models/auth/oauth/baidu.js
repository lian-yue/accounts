/* @flow */
import { baidu as config } from 'config/oauth'

import createError from '../../createError'

import Api from './api'


config.clientId = config.clientId || config.client_id || config.appkey || config.app_key
config.clientSecret = config.clientSecret || config.client_secret || config.appSecret || config.app_secret || config.secretKey || config.secret_key
config.scope = config.scope || config.scopes
if (!(config.scope instanceof Array)) {
  config.scope = config.scope.split(/[|, ]/)
}



export default class Baidu extends Api {


  baseUri: string = 'https://openapi.baidu.com'

  accessTokenPath: string = '/oauth/2.0/token'

  authorizePath: string = '/oauth/2.0/authorize'

  id: string = 'baidu'

  constructor(clientId: string = config.clientId, clientSecret: string = config.clientSecret) {
    super(clientId, clientSecret)
    this.setScope(config.scope)
    if (config.redirectUri) {
      this.setRedirectUri(config.redirectUri)
    }
  }


  getLogoutUri(params: Object = {}): string {
    let query =  {
      ...params,
      next: params.next || params.redirect_uri || this.redirectUri,
      redirect_uri: undefined,
    }
    if (!query.access_token) {
      let accessToken = this.getAccessToken(true)
      if (!accessToken || !accessToken.access_token) {
        throw createError(500, 'notexist', { path: 'access_token' })
      }
      query.access_token = accessToken.access_token
    }
    return this.getUri('/connect/2.0/logout', query)
  }


  /**
  * http://developer.baidu.com/wiki/index.php?title=docs/oauth/baidu_developer
  *
  **/
  getAccessTokenByDeveloperCredentials(params: Object = {}): Promise<AccessToken> {
    let body = {
      ...params,
      grant_type: 'developer_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    }
    return this.request('POST', this.accessTokenPath, {}, body)
  }



  async getUserInfo(): Promise<Object> {
    if (this.userInfo) {
      return this.userInfo
    }
    let userInfo = await this.api('GET', '/rest/2.0/passport/users/getInfo')

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
      result.avatar = 'http://tb.himg.baidu.com/sys/portrait/item/' + result.avatar
    }
    return this.filterUserInfo(result)
  }
}
