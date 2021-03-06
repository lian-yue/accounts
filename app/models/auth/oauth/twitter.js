/* @flow */
import querystring from 'querystring'
import { twitter as config } from 'config/oauth'

import createError from '../../createError'

import Api from './api'

config.consumer_key = config.consumer_key || config.consumerKey || config.clientId || config.client_id || config.appId || config.app_id || config.appKey || config.app_key
config.consumer_secret = config.consumer_secret || config.consumerSecret || config.clientSecret || config.client_secret || config.appSecret || config.app_secret


export default class Twitter extends Api {

  baseUri: string = 'https://api.twitter.com'

  accessTokenPath: string = '/oauth/request_token'

  authorizePath: string = '/oauth/authorize'

  requestTokenPath: string = '/oauth/request_token'

  id: string = 'twitter'

  constructor(clientId: string = config.consumer_key, clientSecret: string = config.consumer_secret) {
    super(clientId, clientSecret)
    if (config.redirectUri) {
      this.setRedirectUri(config.redirectUri)
    }
  }


  async getUserInfo(): Promise<Object> {
    if (this.userInfo) {
      return this.userInfo
    }
    let userInfo = await this.api('GET', '/v1.1/account/verify_credentials.json')


    const columns = {
      id_str: 'id',
      name: 'nickname',
      screen_name: 'username',
      description: 'description',
      time_zone: 'timezone',
      lang: 'locale',
      verified: 'verified',
      avatar: 'avatar',
      profile_image_url: 'avatar',
      profile_image_url_https: 'avatar',
    }

    let result: Object = {}
    for (let column in columns) {
      let column2 = columns[column]
      if (userInfo[column]) {
        result[column2] = userInfo[column]
      }
    }
    if (result.avatar) {
      result.avatar = result.avatar.replace(/_normal\.(\w+)$/, '.$1')
    }
    return this.filterUserInfo(result)
  }


  response(response: Object): Object {
    let body: Object
    if (!response.data) {
      body = {}
    } else if (typeof response.data === 'object') {
      body = response.data
    } else {
      let data: string = response.data
      if (data.substr(0, 1) === '\u007B' || data.substr(0, 1) === '\u005B') {
        body = JSON.parse(data)
      } else if (data.substr(0, 1) === '<') {
        let matches = data.match(/<error>(.+?)<\/error>/i)
        throw createError(500, matches ? matches[1] : 'Response body is html', { body: data })
      } else {
        body = querystring.parse(data)
      }
    }

    if (body.errors) {
      throw createError(500, body.errors[0].message, { code: body.errors[0].code })
    }
    return body
  }
}
