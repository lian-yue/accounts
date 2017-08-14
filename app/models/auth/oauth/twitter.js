import crypto from 'crypto'
import querystring from 'querystring'

import twitter from 'twitter'
import request from 'request'

import {twitter as config} from 'config/oauth'

import Component from './component'
import cache from '../../cache'

config.consumer_key = config.consumer_key || config.consumerKey || config.clientId || config.client_id || config.appId || config.app_id ||  config.appKey || config.app_key
config.consumer_secret = config.consumer_secret || config.consumerSecret || config.clientSecret || config.client_secret || config.appSecret || config.app_secret



export default class Twitter extends Component{

  name = config.name

  get client() {
    if (!this._client) {
      this._client = new twitter(config);
    }
    return this._client;
  }

  get isAuthorize() {
    if (!this.query.oauth_token) {
      return false;
    }
    if (!this.query.oauth_verifier) {
      return false;
    }
    if (this.query.error) {
      return false;
    }
    if (this.query.denied) {
      return false;
    }
    return true;
  }

  async getAccessToken() {
    if (!this._accessToken) {
      if (!this.query.oauth_token) {
        throw new Error('The "oauth_token" is empty')
      }
      if (!this.query.oauth_verifier) {
        throw new Error('The "oauth_verifier" is empty')
      }
      var key = 'auth.oauth.twitter' + crypto.createHash('md5').update(String(this.query.oauth_token)).digest("base64");
      var oauth_token_secret = cache.get(key);
      if (!oauth_token_secret) {
        throw new Error('The "oauth_token_secret" is empty')
      }

      await cache.del(key);

      this._accessToken = await new Promise((resolve, reject) => {
        request.post('https://api.twitter.com/oauth/access_token', {
          oauth: {
            consumer_key: config.consumer_key,
            consumer_secret: config.consumer_secret,
            token_secret: oauth_token_secret,
            token: this.query.oauth_token,
            verifier: this.query.oauth_verifier,
          }
        }, this.parse(resolve, reject));
      })
    }
    return this._accessToken
  }

  setAccessToken(accessToken) {
    if (accessToken && !(accessToken instanceof Object)) {
      throw new Error('Token is not an object')
    }
    this._client = new twitter(Object.assign({}, config, {
      access_token_key: accessToken.oauth_token || accessToken.access_token_key || null,
      access_token_secret: accessToken.oauth_token_secret || accessToken.access_token_secret || null,
    }));
    this._accessToken = accessToken
    return this
  }


  async getUserInfo() {
    if (this._userInfo) {
      return this._userInfo
    }

    var userInfo = await new Promise((resolve, reject) => {
      this.client.get('account/verify_credentials', this.parse(resolve, reject, true));
    })

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

    var result = {}
    for (let column in columns) {
      let column2 = columns[column];
      if (userInfo[column]) {
        result[column2] = userInfo[column]
      }
    }
    if (result.avatar) {
      result.avatar = result.avatar.replace(/_normal\.(\w+)$/, '.$1');
    }
    return this.filterUserInfo(result)
  }


  async redirectUri() {
    var json = await new Promise((resolve, reject) => {
      request.post('https://api.twitter.com/oauth/request_token', {
        oauth: {
          callback: this._redirectUri,
          consumer_key: config.consumer_key,
          consumer_secret: config.consumer_secret,
        }
      }, this.parse(resolve, reject));
    })

    this.state = json.oauth_token
    var key = 'auth.oauth.twitter' + json.oauth_token;
    await cache.set(key, json.oauth_token_secret);
    await cache.expire(key, 3600);
    return 'https://api.twitter.com/oauth/authorize?' + querystring.stringify({oauth_token: json.oauth_token});
  }




  parse(resolve, reject, re) {
    var result = function(err, res, body) {
      if (re) {
        body = res
      }

      var e;
      if (err) {
        if (err instanceof Error) {
          e = err
        } else if (err instanceof Array) {
          e = new Error(err[0].message);
          e.code = err[0].code
        } else {
          e = new Error(err);
        }
        reject(e)
        return
      }

      if (typeof body == 'string') {
        body = body.trim()

        try {
          var sub = body.substr(0, 1);
          if (sub === '\u007B' || sub === '\u005B') {
            body = JSON.parse(body);
          } else if (sub === '<') {
            err = body.match(/<error>(.+?)<\/error>/)
            e = new Error(err ? err[1] : 'Response data is html')
            e.body = body;
            reject(e)
            return;
          } else {
            body = querystring.parse(body)
          }
        } catch (e) {
          reject(e)
          return
        }
      }

      if (body.errors) {
        e = new Error(body.errors[0].message);
        e.code = body.errors[0].code
        reject(e)
        return
      }
      resolve(body);
    }
    return result;
  }
}
