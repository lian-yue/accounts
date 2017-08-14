import querystring from 'querystring'
import {qq as config} from 'config/oauth'

import Api from './api'
import Component from './component'


config.clientId =  config.clientId || config.client_id || config.appkey || config.app_key
config.clientSecret = config.clientSecret || config.client_secret || config.appSecret || config.app_secret  || config.secretKey || config.secret_key
config.scope = config.scope || config.scopes
if (config.scope instanceof Array) {
  config.scope = config.scope.join(',')
}

class QQApi extends Api{

  baseUri = 'https://graph.qq.com'

  _accessTokenPath = '/oauth2.0/token'

  _authorizePath = '/oauth2.0/authorize'

  constructor(clientId, clientSecret, redirectUri) {
    super(clientId, clientSecret, redirectUri)
  }

  getAccessToken(code, params) {
    if (!code && !params) {
      return super.getAccessToken(code, params)
    }
    return new Promise((resolve, reject) => {
      super.getAccessToken(code, params).then((accessToken) => {
        if (accessToken.openid) {
          resolve(accessToken)
          return
        }

        this._request('GET', '/oauth2.0/me', {
          access_token: accessToken.access_token
        }).then((body) => {
          if (!body.openid) {
            throw new Error('openid is empty')
          }
          return Object.assign(accessToken, body)
        }).then(resolve, reject)
      }, reject)
    });
  }


  api(method, path, params, headers, body) {
    if (!params.openid) {
      var accessToken = this.getAccessToken();
      if (!accessToken || !accessToken.openid) {
        throw new Error('Not configuration openid');
      }
      params.openid = accessToken.openid
    }
    return super.getAccessToken(method, path, params, headers, body)
  }


  _response(body) {
    body = body.trim().replace(/[\r\n\t ;]$/g, '');
    if (body.substr(0, 9) == 'callback(') {
      body = body.substr(9, -1).trim()
    }

    if (body.substr(0, 1) === '\u007B' || body.substr(0, 1) === '\u005B') {
      body = JSON.parse(body)
    } else {
      body = querystring.parse(body)
    }


    var message
    if (body.error_description) {
      message = body.error_description
    } else if (body.error) {
      if (isNaN(body.error)) {
        message = body.error
      } else {
        message = 'Error code ' + body.error
        message = body.error
      }
    } else if (body.ret) {
      if (body.msg) {
        message = body.msg
      } else {
        message = 'Error code ' + body.ret
      }
    }
    if (message) {
      var e = new Error(message)
      if (!isNaN(body.error)) {
        e.code = body.error
      }
      throw e;
    }
    return body
  }



  getUserInfo() {
    return this.api('GET', '/user/get_user_info');
  }

}

export default class QQ extends Component{

  name = config.name

  get client() {
    if (!this._client) {
      this._client = new QQApi(config.clientId, config.clientSecret, this._redirectUri);
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
      result.avatar = 'http://tb.himg.qq.com/sys/portrait/item/' +  result.avatar
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
