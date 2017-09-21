/* @flow */
import {weibo as config} from 'config/oauth'
import Api from './api'


config.clientId = config.clientId || config.client_id || config.appkey || config.app_key
config.clientSecret = config.clientSecret || config.client_secret || config.appSecret || config.app_secret
config.scope = config.scope || config.scopes
if (!(config.scope instanceof Array)) {
  config.scope = config.scope.split(/[|, ]/)
}


export default class Weibo extends Api {
  baseUri: string = 'https://api.weibo.com'

  accessTokenPath: string = '/oauth2/access_token'

  revokeTokenPath: string = '/oauth2/revokeoauth2'

  authorizePath: string = '/oauth2/authorize'

  name: string = config.name

  constructor(clientId: string = config.clientId, clientSecret: string = config.clientSecret) {
    super(clientId, clientSecret)
    this.setScope(config.scope)
    if (config.redirectUri) {
      this.setRedirectUri(config.redirectUri)
    }
  }

  getTokenInfo(params: Object = {}) {
    return this.api('POST', '/oauth2/get_token_info', {}, params)
  }


  async getUserInfo(): Promise<Object> {
    if (this.userInfo) {
      return this.userInfo
    }
    let accessToken = this.getAccessToken()
    if (!accessToken || !accessToken.uid) {
      throw new Error('The "uid" is empty')
    }
    let userInfo = await this.api('GET', '/users/show.json', {uid: accessToken.uid})

    let email
    try {
      email = await this.api('GET', '/2/account/profile/email.json')
    } catch (e) {
    }

    let result = {}

    const columns = {
      idstr: 'id',
      domain: 'username',
      screen_name: 'nickname',
      name: 'nickname',
      description: 'description',
      profile_image_url: 'avatar',
      avatar_large: 'avatar',
      avatar_hd: 'avatar',
      gender: 'gender',
      lang: 'locale',
    }


    for (let column in columns) {
      let column2 = columns[column]
      if (userInfo[column]) {
        result[column2] = userInfo[column]
      }
    }
    if (email && email[0] && email[0].email) {
      result.email = email
    }
    return this.filterUserInfo(result)
  }
}
