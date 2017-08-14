import querystring from 'querystring'
import request from 'request-promise'


export default class Api {
  baseUri = ''

  clientId = ''

  clientSecret = ''

  accessToken = {}

  timeout = 15000

  redirectUri

  _accessTokenPath = "/oauth/access_token"

  _authorizePath = "/oauth/authorize"

  constructor(clientId, clientSecret, redirectUri) {
    this.clientId = clientId
    this.clientSecret = clientSecret
    this.redirectUri = redirectUri
  }


  getAccessToken(code, params) {
    if (code || params) {
      params = params || {};
      params.code = code
      params.client_id = this.clientId
      params.client_secret = this.clientSecret
      params.redirect_uri = this.redirectUri
      params.grant_type = 'authorization_code'

      return this._request('POST', this._accessTokenPath, null, null, params).then((accessToken) => {
        this.accessToken = accessToken
        return accessToken
      })
    }
    return this.accessToken
  }

  setAccessToken(params) {
    this.accessToken = params
  }


  getAuthorizeUri(params) {
    params = params || {};
    params.client_id = this.clientId
    params.redirect_uri = this.redirectUri
    params.response_type = params.response_type || 'code'
    return this.getUri(this._authorizePath, params)
  }

  getAccessTokenByRefreshToken(params) {
    params = params || {}
    params.grant_type = 'refresh_token'
    params.client_id = this.clientId
    params.client_secret = this.clientSecret
    params.redirect_uri = this.redirectUri
    var accessToken = this.getAccessToken() || {}
    if (!params.refresh_token) {
      if (!accessToken.refresh_token) {
        throw new Error('Not configuration refresh_token');
      }
      params.refresh_token = accessToken.refresh_token;
    }
    return this._request('POST', this._accessTokenPath, null, null, params).then((accessToken) => {
      accessToken.refresh_token = params.refresh_token
      this.setAccessToken(accessToken)
      return accessToken
    });
  }


  api(method, path, params, headers, body) {
    params = params || {}
    if (!params.access_token) {
      var accessToken = this.getAccessToken();
      if (!accessToken.access_token) {
        throw new Error('Not configuration access_token');
      }
      params.access_token = accessToken.access_token;
    }
    return this._request(method, path, params, headers, body)
  }


  getUri(path, params) {
    var uri
    if (path.substr(0, 7) === 'http://' || path.substr(0, 8) === 'https://') {
      uri = path;
    } else {
      uri = this.baseUri +'/' + path.replace(/^\//, '');
    }
    if (params instanceof Object) {
      params = querystring.stringify(params)
    }
    if (params) {
      uri += '?' + params;
    }
    return uri;
  }


  _response(body) {
    return body
  }

  _request(method, path, params, headers, body) {
    headers = headers || {}
    headers['User-Agent'] = 'OAuth/2.0 (LianYue; http://lianyue.org, https://github.com/lian-yue)'


    if (method == 'POST') {
      headers['Content-Type'] = headers['Content-Type'] || 'application/x-www-form-urlencoded'
    }

    if (body instanceof Object) {
      body = querystring.stringify(body)
    }

    var url = this.getUri(path, params)

    return request({
      url,
      timeout: this.timeout,
      method,
      headers,
      body,
    }).then(this._response)
  }
}
