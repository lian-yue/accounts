import {baidu as config} from 'config/oauth'

import Api from './api'
import Component from './component'

config.clientId =  config.clientId || config.client_id || config.appkey || config.app_key
config.clientSecret = config.clientSecret || config.client_secret || config.appSecret || config.app_secret  || config.secretKey || config.secret_key
config.scope = config.scope || config.scopes
if (config.scope instanceof Array) {
  config.scope = config.scope.join(' ')
}

class BaiduApi extends Api{

  baseUri = 'https://openapi.baidu.com'

  _accessTokenPath = '/oauth/2.0/token'

  _authorizePath = '/oauth/2.0/authorize'

  getLogoutUri(params) {
    params = params || {}
    if (!params.access_token) {
      var accessToken = this.getAccessToken();
      if (!accessToken || !accessToken.access_token) {
        throw new Error('Not configuration access_token');
      }
      params.access_token = accessToken.access_token;
    }
    params.next = params.next || params.redirect_uri || this.redirectUri
    delete params.redirect_uri
    return this.getUri('/connect/2.0/logout', params);
  }



  /**
  *   http://developer.baidu.com/wiki/index.php?title=docs/oauth/client
  **/
  getAccessTokenByClientCredentials(params) {
    params = params || {}
    params.grant_type = 'client_credentials'
    params.client_id = this.clientId
    params.client_secret = this.clientSecret
    var request = this._request('GET', this._accessTokenPath, params);
    return params;
  }

  /**
  * http://developer.baidu.com/wiki/index.php?title=docs/oauth/baidu_developer
  *
  **/
  getAccessTokenByDeveloperCredentials(params) {
    params = params || {}
    params.grant_type = 'developer_credentials'
    params.client_id = this.clientId
    params.client_secret = this.clientSecret
    var request = this._request('GET', this._accessTokenPath, params);
    return params;
  }

  getUserInfo() {
    return this.api('GET', '/rest/2.0/passport/users/getInfo');
  }

  _response(body) {
    body = JSON.parse(body)

    var message;
    if (body.error_description) {
      message = body.error_description;
    } else if (body.error) {
      message = body.error;
    } else if (body.error_msg) {
      message = body.error_msg;
    } else if (body.error_code) {
      message = 'Error code ' + body.error_code;
    }
    if (message) {
      var e = new Error(message)
      if (body.error_code) {
        e.code = body.error_code
      }
      throw e;
    }
    return body
  }
}

export default class Baidu extends Component{

  name = config.name

  get client() {
    if (!this._client) {
      this._client = new BaiduApi(config.clientId, config.clientSecret, this._redirectUri);
    }
    return this._client;
  }


  async getUserInfo() {
    if (this._userInfo) {
      return this._userInfo
    }

    var userInfo = await this.client.getUserInfo();


    /*var email;
    try {
      email = await this.client.api('GET', '/2/account/profile/email.json');
    } catch (e) {
    }*/



    var result = {}

    const columns = {
      userid: 'id',
      domain: 'username',
      username: 'nickname',
      userdetail: 'description',
      portrait:'avatar',
      birthday:'birthday',
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
          break;
        default:
          delete result.gender
      }
    }

    if (result.birthday && result.birthday == '0000-00-00') {
      delete result.birthday;
    }
    if (result.avatar) {
      result.avatar = 'http://tb.himg.baidu.com/sys/portrait/item/' +  result.avatar
    }

    return this.filterUserInfo(result)
  }


  async redirectUri() {
    return this.client.getAuthorizeUri({
      scope: config.scope,
      state: this.state,
      response_type: 'code',
    });
  }
}
