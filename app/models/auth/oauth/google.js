/* @flow */
import { google as config } from 'config/oauth'

import Api from './api'

config.clientId = config.clientId || config.client_id || config.appId || config.app_id
config.clientSecret = config.clientSecret || config.appSecret || config.app_secret
config.scopes = config.scopes || config.scope
if (!(config.scopes instanceof Array)) {
  config.scopes = config.scopes.split(/[|, ]/)
}

export default class Google extends Api {

  baseUri: string = 'https://www.googleapis.com'

  accessTokenPath: string = '/oauth2/v4/token'

  authorizePath: string = 'https://accounts.google.com/o/oauth2/v2/auth'

  revokeTokenPath: string = 'https://accounts.google.com/o/oauth2/revoke'

  name: string = config.name

  scopeSeparator: string = ' '

  constructor(clientId: string = config.clientId, clientSecret: string = config.clientSecret) {
    super(clientId, clientSecret)
    this.setScope(config.scopes)
    if (config.redirectUri) {
      this.setRedirectUri(config.redirectUri)
    }
  }

  async getUserInfo(): Promise<Object> {
    if (this.userInfo) {
      return this.userInfo
    }
    let userInfo = await this.api('POST', '/userinfo/v2/me')

    let result = {}
    const columns = {
      id: 'id',
      name: 'nickname',
      email: 'email',
      picture: 'avatar',
      gender: 'gender',
      locale: 'locale',
      verified_email: 'verified_email',
    }
    for (let column in columns) {
      let column2 = columns[column]
      if (userInfo[column]) {
        result[column2] = userInfo[column]
      }
    }
    return this.filterUserInfo(result)
  }
}
