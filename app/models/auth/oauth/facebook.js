import FB from 'fb'
import {facebook as config} from 'config/oauth'
import Component from './component'

config.appId = config.appId || config.app_id || config.clientId ||  config.client_id
config.appSecret = config.appSecret || config.app_secret || config.clientSecret ||  config.client_secret
config.scope = config.scope || config.scopes
if (config.scope instanceof Array) {
  config.scope = config.scope.join(',')
}
config.version = 'v2.7'


export default class FaceBook extends Component{

  name = config.name

  get client() {
    if (!this._client) {
      this._client = FB.extend(config);
    }
    return this._client;
  }

  async getAccessToken() {
    if (!this._accessToken) {
      if (!this.query.code) {
        throw new Error('The code is empty')
      }
      this._accessToken = await new Promise((resolve, reject) => {
        this.client.napi('oauth/access_token', {
          client_id: this.client.options('appId'),
          client_secret: this.client.options('appSecret'),
          redirect_uri: this._redirectUri,
          state: this.state,
          code: this.query.code,
        }, (err, result) => {
          if (err) {
            reject(err)
            return
          }
          result.created_at = new Date;
          this.client.setAccessToken(result.access_token);
          resolve(result)
        });
      })
    }
    return this._accessToken
  }

  setAccessToken(accessToken) {
    if (accessToken && !(accessToken instanceof Object)) {
      throw new Error('Token is not an object')
    }
    this._accessToken = accessToken
    this.client.setAccessToken(accessToken.access_token || null);
    return this
  }


  async getUserInfo() {
    if (this._userInfo) {
      return this._userInfo
    }
    var userInfo = await new Promise((resolve, reject) => {
      this.client.napi('me', {fields: ['id', 'name', 'gender', 'locale', 'timezone', 'verified', 'email', 'birthday']}, (err, result) => {
        if (err) {
          reject(err)
          return
        }
        resolve(result);
      });
    })

    var picture = await new Promise((resolve, reject) => {
      this.client.napi('me/picture', {redirect:0, height:256, width:256, type: 'normal'}, (err, result) => {
        if (err) {
          reject(err)
          return
        }
        resolve(result);
      });
    })

    var result = {}

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


  async redirectUri() {
    return this.client.getLoginUrl({
      scope: config.scope,
      redirect_uri: this._redirectUri,
      state: this.state,
    });
  }
}
