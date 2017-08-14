import {weibo as config} from 'config/oauth'
import Component from './component'
import Api from './api'


config.clientId =  config.clientId || config.client_id || config.appkey || config.app_key
config.clientSecret = config.clientSecret || config.client_secret || config.appSecret || config.app_secret
config.scope = config.scope || config.scopes
if (config.scope instanceof Array) {
  config.scope = config.scope.join(',')
}

class WeiboApi extends Api{

  baseUri = 'https://api.weibo.com'

  _accessTokenPath = '/oauth2/access_token'

  _authorizePath = '/oauth2/authorize'



  getAccessTokenByPassowrd(params) {
    params = params || {}
    params.grant_type = 'password'
    params.client_id = this.clientId
    params.client_secret = this.clientSecret
    params.redirect_uri = this.redirectUri
    if (!params.username) {
      throw new Error('The user name is empty');
    }

    if (params.password) {
      throw new Error('The password is empty');
    }

    return this._request('POST', this._accessTokenPath, null, null, params).then((accessToken) => {
      this.setAccessToken(accessToken)
      return accessToken
    });
  }


  getTokenInfo(params) {
    params = params || {}
    return this.api('POST', '/oauth2/get_token_info', null, null, params);
  }

  revokeOAuth2(params) {
    params = params || {}
    return this.api('GET', '/oauth2/revokeoauth2', params);
  }

  getUsersShow(params) {
    params = params || {}
    if (!params.uid && this.accessToken && this.accessToken.uid) {
      params.uid = this.accessToken.uid
    }
    return this.api('GET', '/users/show.json', params)
  }

  _response(body) {
    body = JSON.parse(body)

    var message;
    if (body.error_description) {
      message = body.error_description;
    } else if (body.error) {
      message = body.error;
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

export default class Weibo extends Component{

  name = config.name

  get client() {
    if (!this._client) {
      this._client = new WeiboApi(config.clientId, config.clientSecret, this._redirectUri);
    }
    return this._client;
  }

  async getUserInfo() {
    if (this._userInfo) {
      return this._userInfo
    }

    var userInfo = await this.client.getUsersShow();



    var email;
    try {
      email = await this.client.api('GET', '/2/account/profile/email.json');
    } catch (e) {
    }



    var result = {}

    const columns = {
      idstr: 'id',
      domain: 'username',
      screen_name: 'nickname',
      name: 'nickname',
      description: 'description',
      profile_image_url:'avatar',
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
      result[email] = email;
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
