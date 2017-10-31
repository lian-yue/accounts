/* @flow */
import { facebook as config } from 'config/oauth'

import createError  from '../../createError'

import Api from './api'

config.appId = config.appId || config.app_id || config.clientId || config.client_id
config.appSecret = config.appSecret || config.app_secret || config.clientSecret || config.client_secret
config.scope = config.scope || config.scopes

export default class Facebook extends Api {

  baseUri: string = 'https://graph.facebook./v2.10'

  accessTokenPath: string = '/oauth/access_token'

  authorizePath: string = 'https://www.facebook.com/v2.10/dialog/oauth'

  name: string = config.name


  constructor(clientId: string = config.appId, clientSecret: string = config.appSecret) {
    super(clientId, clientSecret)
    this.setScope(config.scope)
    if (config.redirectUri) {
      this.setRedirectUri(config.redirectUri)
    }
  }

  async getAccessTokenByAuthorizationCode(params: Object = {}): Promise<AccessToken> {
    if (!params.code || typeof params.code !== 'string') {
      throw createError(400, 'required', { path: 'code' })
    }
    if (!params.state || typeof params.state !== 'string') {
      throw createError(400, 'required', { path: 'state' })
    }

    let data = await this.getAuthorizeData(params)

    if (!data) {
      throw createError(400, 'notexist', { path: 'state' })
    }

    let query = {
      ...params,
      code: params.code,
      state: params.state,
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    }
    let accessToken: AccessToken = await this.request('GET', this.accessTokenPath, query)
    return this.setAccessToken(accessToken) || {}
  }

  async getUserInfo(): Promise<Object> {
    if (this.userInfo) {
      return this.userInfo
    }
    let userInfo = await this.api('GET', '/me', {
      fields: ['id', 'name', 'gender', 'locale', 'timezone', 'verified', 'email', 'birthday'].join(',')
    })

    let picture = await this.api('GET', '/picture', {
      redirect: 0,
      height: 256,
      width: 256,
      type: 'normal'
    })


    let result = {}

    const columns = {
      id: 'id',
      name: 'nickname',
      gender: 'gender',
      locale: 'locale',
      timezone: 'timezone',
      email: 'email',
    }

    for (let column in columns) {
      let column2 = columns[column]
      if (userInfo[column]) {
        result[column2] = userInfo[column]
      }
    }

    if (userInfo.email && userInfo.verified) {
      result.verified_email = true
    }

    if (picture.data && picture.data.url) {
      result.avatar = picture.data.url
    }

    return this.filterUserInfo(result)
  }

  response(response: Object): Object {
    let body: Object = response.body ? JSON.parse(response.body) : {}

    let message
    if (body.error_description) {
      message = body.error_description
    } else if (body.error) {
      if (typeof body.error === 'object') {
        message = body.error.message
      } else {
        message = body.error
      }
    } else if (body.error_msg) {
      message = body.error_msg
    } else if (body.error_message) {
      message = body.error_message
    } else if (body.error_code) {
      message = 'Error code: ' + body.error_code
    } else if (response.statusCode >= 400) {
      message = 'Error status code: ' + response.statusCode
    }

    if (message) {
      let props = {}
      if (body.error && typeof body.error === 'object' && body.error.code) {
        props.code = body.error.code
      } else if (body.error_code) {
        props.code = body.error_code
      }
      throw createError(response.statusCode >= 400 ? response.statusCode : 500, message, props)
    }
    return body
  }

}
