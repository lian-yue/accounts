/* @flow */
import crypto from 'crypto'
import querystring from 'querystring'
import request from 'request-promise'

import cache from '../../cache'

export default class Api {
  baseUri: string

  name: string

  key: string = ''

  clientId: string

  clientSecret: string

  accessToken: accessTokenType | null = null

  timeout: number = 15000

  redirectUri: string = ''

  accessTokenPath: string = '/oauth/access_token'

  revokeTokenPath: string = ''

  authorizePath: string = '/oauth/authorize'

  // oauth 1
  requestTokenPath: string = ''

  scope: string[]

  scopeSeparator: string = ','

  userInfo: ?Object

  data: Object

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.data = {}
  }


  getAccessToken(expire: boolean = false): accessTokenType | null {
    let accessToken = this.accessToken
    if (!accessToken) {
      return null
    }
    if (expire && accessToken.expires_in && accessToken.created_at && (accessToken.created_at.getTime() + Number(accessToken.expires_in) * 1000) < Date.now()) {
      let e = new Error('"access_token" has expired')
      e.statusCode = 403
      throw e
    }
    return accessToken
  }


  setAccessToken(accessToken: ?accessTokenType): accessTokenType | null {
    if (!accessToken) {
      // null
    } else if (this.requestTokenPath) {
      if (!accessToken.oauth_token_secret) {
        throw new Error('The "oauth_token_secret" is empty')
      }
      if (!accessToken.oauth_token) {
        throw new Error('The "oauth_token" is empty')
      }
    } else if (!accessToken.access_token) {
      if (!accessToken.access_token) {
        throw new Error('The "access_token" is empty')
      }
    }
    if (accessToken && !accessToken.created_at) {
      accessToken.created_at = new Date
    }
    this.accessToken = accessToken || null
    return this.accessToken
  }



  async getAccessTokenByAuthorizationCode(params: Object = {}): Promise<accessTokenType> {
    if (this.requestTokenPath) {
      if (!params.oauth_token || typeof params.oauth_token !== 'string') {
        throw new Error('The "oauth_token" is empty')
      }
      if (!params.oauth_verifier) {
        throw new Error('The "oauth_verifier" is empty')
      }
      let data = await this.getAuthorizeData(params)
      if (!data || !data.oauth_token_secret) {
        throw new Error('The "oauth_token_secret" is empty')
      }

      let accessToken = await this.request('POST', this.accessTokenPath, {}, {}, {}, {
        oauth: {
          consumer_key: this.clientId,
          consumer_secret: this.clientSecret,
          token_secret: data.oauth_token_secret,
          token: params.oauth_token,
          verifier: String(params.oauth_verifier),
        }
      })
      return this.setAccessToken(accessToken) || {}
    }

    if (!params.code || typeof params.code !== 'string') {
      throw new Error('The "code" is empty')
    }
    if (!params.state || typeof params.state !== 'string') {
      throw new Error('The "state" is empty')
    }

    let data = await this.getAuthorizeData(params)
    if (!data) {
      throw new Error('"state" does not exist')
    }

    let body = {
      ...params,
      code: params.code,
      state: params.state,
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    }
    let accessToken: accessTokenType = await this.request('POST', this.accessTokenPath, {}, body)
    return this.setAccessToken(accessToken) || {}
  }

  getAccessTokenByPassowrd(params: Object): Promise<accessTokenType> {
    let body = {
      ...params,
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    }
    if (!body.username) {
      throw new Error('The username is empty')
    }
    if (body.password) {
      throw new Error('The password is empty')
    }

    return this.request('POST', this.accessTokenPath, {}, body).then((accessToken: accessTokenType) => {
      return this.setAccessToken(accessToken) || {}
    })
  }


  getAccessTokenByClientCredentials(params: Object = {}): Promise<accessTokenType> {
    let body = {
      ...params,
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    }
    return this.request('POST', this.accessTokenPath, {}, body)
  }


  getAccessTokenByRefreshToken(params: Object = {}): Promise<accessTokenType> {
    if (this.requestTokenPath) {
      throw new Error('oauth 1.* does not support')
    }
    params.grant_type = 'refresh_token'
    params.client_id = this.clientId
    params.client_secret = this.clientSecret
    params.redirect_uri = this.redirectUri
    let accessToken = this.getAccessToken()
    if (!params.refresh_token) {
      if (!accessToken || !accessToken.refresh_token) {
        throw new Error('Not configuration refresh_token')
      }
      params.refresh_token = accessToken.refresh_token
    }
    return this.request('POST', this.accessTokenPath, {}, params).then((newAccessToken: accessTokenType) => {
      if (!newAccessToken.refresh_token) {
        newAccessToken.refresh_token = params.refresh_token
      }
      return this.setAccessToken(newAccessToken) || {}
    })
  }

  revokeToken(params: Object = {}): Promise<Object> {
    if (!this.revokeTokenPath) {
      throw new Error('`revokeTokenPath` is not configured')
    }
    return this.api('POST', this.revokeTokenPath, {}, params)
  }


  getScope(): string[] {
    return this.scope
  }

  setScope(scope: string[]): string[] {
    this.scope = scope
    return this.scope
  }

  getRedirectUri(): string {
    return this.redirectUri
  }

  setRedirectUri(redirectUri: string): string {
    this.redirectUri = redirectUri
    return this.redirectUri
  }

  setKey(key: string): string {
    this.key = key
    return this.key
  }

  getKey(key: string): string {
    return this.key
  }

  keyCache(key: string): string {
    return 'models.oauth.' + this.baseUri.replace(/^https?\/\//, '').replace(/^\.\w+$/, '') + this.key + crypto.createHash('md5').update(key).digest('base64')
  }

  getCache(key: string): Promise<*> {
    return cache.get(this.keyCache(key)).then(function (data) {
      if (!data) {
        return data
      }
      return JSON.parse(data)
    })
  }

  setCache(key: string, data: Object, expire: number = 3600): Promise<*> {
    let key2 = this.keyCache(key)
    return cache.multi().set(key2, JSON.stringify(data)).expire(key2, expire).exec()
  }

  delCache(key: string): Promise<*> {
    return cache.del(this.keyCache(key))
  }

  isAuthorize(params: Object): boolean {
    if (this.requestTokenPath) {
      if (!params.oauth_token) {
        return false
      }
      if (!params.oauth_verifier) {
        return false
      }
    } else {
      if (!params.code) {
        return false
      }
      if (!params.state) {
        return false
      }
    }
    if (params.error) {
      return false
    }
    if (params.denied) {
      return false
    }
    return true
  }

  keyAuthorizeData(params: Object = {}): string {
    if (this.requestTokenPath) {
      if (!params.oauth_token || typeof params.oauth_token !== 'string') {
        throw new Error('The "oauth_token" is empty')
      }
      return 'data.' + params.oauth_token
    }
    if (!params.state || typeof params.state !== 'string') {
      throw new Error('The "state" is empty')
    }
    return 'data.' + params.state
  }

  async getAuthorizeData(params: Object = {}): Promise<*> {
    let key = this.keyAuthorizeData(params)
    if (this.data[key]) {
      return this.data[key]
    }
    let data = await this.getCache(key)
    if (data) {
      await this.delCache(key)
    }
    return data
  }

  async getAuthorizeUri(params: Object = {}, data: Object = {}): Promise<string> {
    if (this.requestTokenPath) {
      let requestToken: accessTokenType = await this.request('POST', this.requestTokenPath, {}, {}, {}, {
        oauth: {
          callback: this.redirectUri,
          consumer_key: this.clientId,
          consumer_secret: this.clientSecret,
        }
      })
      await this.setCache(this.keyAuthorizeData(requestToken), {...data, oauth_token_secret: requestToken.oauth_token_secret}, 3600)

      return this.getUri(this.authorizePath, {
        ...params,
        oauth_token: requestToken.oauth_token
      })
    }

    let state = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2)
    await this.setCache(this.keyAuthorizeData({state}), data, 3600)

    return this.getUri(this.authorizePath, {
      ...params,
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: this.getScope().join(this.scopeSeparator),
      state,
      response_type: params.response_type || 'code',
    })
  }



  api(method: string, path: string, params: Object = {}, body: Object = {}, headers: Object = {}, args: Object = {}): Promise<Object> {
    if (this.requestTokenPath) {
      if (!args.oauth) {
        let oauth_token = params.oauth_token || params.access_token_key || params.access_token
        let oauth_token_secret = params.oauth_token_secret || params.access_token_secret
        if (!oauth_token || !oauth_token_secret) {
          let accessToken = this.getAccessToken(true)
          if (!accessToken || !accessToken.oauth_token || !accessToken.oauth_token_secret) {
            throw new Error('Not configuration access_token')
          }
          oauth_token = accessToken.oauth_token
          oauth_token_secret = accessToken.oauth_token_secret
        }

        delete params.oauth_token
        delete params.access_token_key
        delete params.access_token
        delete params.oauth_token_secret
        delete params.access_token_secret
        args.oauth = {
          consumer_key: this.clientId,
          consumer_secret: this.clientSecret,
          token: String(oauth_token),
          token_secret: String(oauth_token_secret),
        }
      }
    } else if (!params.access_token && !body.access_token) {
      let accessToken = this.getAccessToken(true)
      if (!accessToken || !accessToken.access_token) {
        throw new Error('Not configuration access_token')
      }
      if (method === 'GET' || method === 'HEAD') {
        params.access_token = accessToken.access_token
      } else {
        body.access_token = accessToken.access_token
      }
    }
    return this.request(method, path, params, headers, body, args)
  }


  getUri(path: string, params: string | Object = ''): string {
    let uri
    if (path.substr(0, 7) === 'http://' || path.substr(0, 8) === 'https://') {
      uri = path
    } else {
      uri = this.baseUri + '/' + path.replace(/^\//, '')
    }
    if (params instanceof Object) {
      let qs = querystring.stringify(params)
      if (qs) {
        uri += '?' + qs
      }
    } else if (params && typeof params === 'string') {
      uri += '?' + params
    }
    return uri
  }


  getUserInfo(body: string): Promise<Object> {
    return Promise.resolve({})
  }


  filterUserInfo(userInfo: Object) {
    if (userInfo.gender === 'other' || userInfo.gender === 2 || userInfo.gender === '' || userInfo.gender === 'n') {
      delete userInfo.gender
    } else if (userInfo.gender === 0 || userInfo.gender === '0' || userInfo.gender === 'f') {
      userInfo.gender = 'female'
    } else if (userInfo.gender === 1 || userInfo.gender === '1' || userInfo.gender === 'm') {
      userInfo.gender = 'male'
    }

    if (!userInfo.username && userInfo.email) {
      userInfo.username = userInfo.email.split('@', 2)[0]
    }

    if (userInfo.username) {
      userInfo.username = userInfo.username.toLowerCase()
    }

    this.userInfo = userInfo
    return this.userInfo
  }

  response(response: Object): Object {
    let body: Object = response.body ? JSON.parse(response.body) : {}

    let message
    if (body.error_description) {
      message = body.error_description
    } else if (body.error) {
      message = body.error
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
      let e = new Error(message)
      if (body.error_code) {
        e.code = Number(body.error_code)
      }
      if (response.statusCode >= 400) {
        e.statusCode = response.statusCode
      }
      throw e
    }
    return body
  }

  request(method: string, path: string, params: Object = {}, body: Object = {}, headers: Object = {}, args: Object = {}): Promise<*> {
    headers['User-Agent'] = 'OAuth/2.0 (LianYue; http://lianyue.org, https://github.com/lian-yue)'


    if (method === 'POST' && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded'
    }
    let bodyString: string = querystring.stringify(body)

    let url = this.getUri(path, params)

    return request({
      url,
      timeout: this.timeout,
      method,
      headers,
      body: bodyString || null,
      resolveWithFullResponse: true,
      ...args,
    }).then(this.response)
  }
}
