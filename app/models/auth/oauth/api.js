/* @flow */
import crypto from 'crypto'
import querystring from 'querystring'
import axios from 'axios'
import oauth from 'oauth-sign'
import createError  from '../../createError'

import cache from '../../cache'

export default class Api {
  baseUri: string

  name: string

  key: string = ''

  clientId: string

  clientSecret: string

  accessToken: AccessToken | null = null

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


  getAccessToken(expire: boolean = false): AccessToken | null {
    let accessToken = this.accessToken
    if (!accessToken) {
      return null
    }
    if (expire && accessToken.expires_in && accessToken.created_at && (accessToken.created_at.getTime() + Number(accessToken.expires_in) * 1000) < Date.now()) {
      throw createError(403, 'hasexpire', { path: 'access_token' })
    }
    return accessToken
  }

  setAccessToken(accessToken: ?AccessToken): AccessToken | null {
    if (!accessToken) {
      // null
    } else if (this.requestTokenPath) {
      if (!accessToken.oauth_token_secret) {
        throw createError(500, 'notexist', { path: 'oauth_token_secret' })
      }
      if (!accessToken.oauth_token) {
        throw createError(500, 'notexist', { path: 'oauth_token' })
      }
    } else if (!accessToken.access_token) {
      if (!accessToken.access_token) {
        throw createError(500, 'notexist', { path: 'access_token' })
      }
    }
    if (accessToken && !accessToken.created_at) {
      accessToken.created_at = new Date
    }
    this.accessToken = accessToken || null
    return this.accessToken
  }



  async getAccessTokenByAuthorizationCode(params: Object = {}): Promise<AccessToken> {
    if (this.requestTokenPath) {
      if (!params.oauth_token || typeof params.oauth_token !== 'string') {
        throw createError(400, 'required', { path: 'oauth_token' })
      }
      if (!params.oauth_verifier) {
        throw createError(400, 'required', { path: 'oauth_verifier' })
      }
      let data = await this.getAuthorizeData(params)
      if (!data || !data.oauth_token_secret) {
        throw createError(403, 'notexist', { path: 'oauth_token_secret' })
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
      throw createError(400, 'required', { path: 'code' })
    }
    if (!params.state || typeof params.state !== 'string') {
      throw createError(400, 'required', { path: 'state' })
    }

    let data = await this.getAuthorizeData(params)
    if (!data) {
      throw createError(403, 'notexist', { path: 'state', value: params.state })
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
    let accessToken: AccessToken = await this.request('POST', this.accessTokenPath, {}, body)
    return this.setAccessToken(accessToken) || {}
  }

  getAccessTokenByPassowrd(params: Object): Promise<AccessToken> {
    let body = {
      ...params,
      grant_type: 'password',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    }
    if (!body.username) {
      throw createError(400, 'required', { path: 'username' })
    }
    if (body.password) {
      throw createError(400, 'required', { path: 'password' })
    }

    return this.request('POST', this.accessTokenPath, {}, body).then((accessToken: AccessToken) => {
      return this.setAccessToken(accessToken) || {}
    })
  }


  getAccessTokenByClientCredentials(params: Object = {}): Promise<AccessToken> {
    let body = {
      ...params,
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    }
    return this.request('POST', this.accessTokenPath, {}, body)
  }


  getAccessTokenByRefreshToken(params: Object = {}): Promise<AccessToken> {
    if (this.requestTokenPath) {
      throw createError(500, 'oauth 1.* does not support')
    }
    params.grant_type = 'refresh_token'
    params.client_id = this.clientId
    params.client_secret = this.clientSecret
    params.redirect_uri = this.redirectUri
    let accessToken = this.getAccessToken()
    if (!params.refresh_token) {
      if (!accessToken || !accessToken.refresh_token) {
        throw createError(500, 'notexist', { path: 'refresh_token' })
      }
      params.refresh_token = accessToken.refresh_token
    }
    return this.request('POST', this.accessTokenPath, {}, params).then((newAccessToken: AccessToken) => {
      if (!newAccessToken.refresh_token) {
        newAccessToken.refresh_token = params.refresh_token
      }
      return this.setAccessToken(newAccessToken) || {}
    })
  }

  revokeToken(params: Object = {}): Promise<Object> {
    if (!this.revokeTokenPath) {
      throw createError(500, 'notexist', { path: 'revokeTokenPath' })
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
        throw createError(400, 'required', { path: 'oauth_token' })
      }
      return 'data.' + params.oauth_token
    }
    if (!params.state || typeof params.state !== 'string') {
      throw createError(400, 'required', { path: 'state' })
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
      let requestToken: AccessToken = await this.request('POST', this.requestTokenPath, {}, {}, {}, {
        oauth: {
          callback: this.redirectUri,
          consumer_key: this.clientId,
          consumer_secret: this.clientSecret,
        }
      })
      await this.setCache(this.keyAuthorizeData(requestToken), { ...data, oauth_token_secret: requestToken.oauth_token_secret }, 3600)

      return this.getUri(this.authorizePath, {
        ...params,
        oauth_token: requestToken.oauth_token
      })
    }

    let state = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2)
    await this.setCache(this.keyAuthorizeData({ state }), data, 3600)

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
            throw createError(500, 'notexist', { path: 'access_token' })
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
        throw createError(500, 'notexist', { path: 'access_token' })
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


  getUserInfo(): Promise<Object> {
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
    let body: Object = response.data ? JSON.parse(response.data) : {}

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
      let props = {}
      if (body.error_code) {
        props.code = body.error_code
      }
      throw createError(response.statusCode >= 400 ? response.statusCode : 500, message, props)
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
    if (args.oauth) {
      let oa = {}
      for (let key in args.oauth) {
        oa['oauth_' + key] = args.oauth[key]
      }

      if (!oa.oauth_version) {
        oa.oauth_version = '1.0'
      }

      if (!oa.oauth_timestamp) {
        oa.oauth_timestamp = Math.floor(Date.now() / 1000).toString()
      }

      if (!oa.oauth_nonce) {
        oa.oauth_nonce = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2)
      }

      let consumer_secret: string = oa.oauth_consumer_secret || oa.oauth_private_key // eslint-disable-line camelcase
      delete oa.oauth_consumer_secret
      delete oa.oauth_private_key


      let token_secret: string = oa.oauth_token_secret
      delete oa.oauth_token_secret

      let realm: string = oa.oauth_realm
      delete oa.oauth_realm
      delete oa.oauth_transport_method


      oa.oauth_signature = oauth.sign(
        'HMAC-SHA1',
        method,
        this.getUri(path),
        { ...params, ...body, ...oa },
        consumer_secret,
        token_secret,
      )

      if (realm) {
        oa.realm = realm
      }
      delete args.oauth

      let sorts = Object.keys(oa).filter(function (i) {
        return i !== 'realm' && i !== 'oauth_signature'
      }).sort()

      if (oa.realm) {
        sorts.unshift('realm')
      }
      sorts.push('oauth_signature')

      // headers
      headers.Authorization = 'OAuth ' + sorts.map(key => key + `="${oauth.rfc3986(oa[key])}"`).join(',')
    }

    return axios({
      url,
      timeout: this.timeout,
      method,
      headers,
      data: bodyString || null,
      validateStatus(status) {
        return status >= 100 && status < 600
      },
      responseType: 'text',
      maxRedirects: 3,
      ...args,
    }).then(this.response)
  }
}
