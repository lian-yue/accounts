import googleapis from 'googleapis'
import {google as config} from 'config/oauth'

import Component from './component'

const OAuth2 = googleapis.auth.OAuth2
const userinfo = googleapis.oauth2("v2")

config.clientId = config.clientId || config.client_id || config.appId ||  config.app_id
config.clientSecret = config.clientSecret || config.appSecret || config.app_secret
config.scopes = config.scopes || config.scope

export default class Google extends Component {

  name = config.name

  get client() {
    if (!this._client) {
      this._client = new OAuth2(config.clientId, config.clientSecret, this._redirectUri, config);
    }
    return this._client;
  }

  async getAccessToken() {
    if (!this._accessToken) {
      if (!this.query.code) {
        throw new Error('The code is empty')
      }
      this._accessToken = await new Promise((resolve, reject) => {
        this.client.getToken(this.query.code, (e, accessToken) => {
          if (e) {
            reject(e)
            return;
          }
          this.client.setCredentials(accessToken);
          resolve(accessToken)
        })
      })
    }
    return this._accessToken
  }

  setAccessToken(accessToken) {
    if (accessToken && !(accessToken instanceof Object)) {
      throw new Error('Token is not an object')
    }
    this.client.setCredentials(accessToken || {});
    this._accessToken = accessToken
    return this
  }


  async getUserInfo() {
    if (this._userInfo) {
      return this._userInfo;
    }
    return await new Promise((resolve, reject) => {
      userinfo.userinfo.v2.me.get({auth: this.client}, (e, response) => {
        if (e) {
          reject(e)
          return;
        }

        resolve(response)
      });
    }).then(function(userInfo) {
      var result = {}
      const columns = {
        id:'id',
        name: 'nickname',
        email: 'email',
        gender: 'gender',
        picture: 'avatar',
        gender: 'gender',
        locale: 'locale',
        verified_email: 'verified_email',
      }
      for (let column in columns) {
        let column2 = columns[column];
        if (userInfo[column]) {
          result[column2] = userInfo[column]
        }
      }
      return result;
    }).then(this.filterUserInfo);
  }

  async redirectUri() {
    return this.client.generateAuthUrl({
      access_type: "online",
      scope: config.scopes,
      state: this.state,
    });
  }
}
