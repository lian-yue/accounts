export default class Component {

  name = 'Empty'

  constructor(query, redirectUri) {
    this.query = query || {};
    this._redirectUri = redirectUri;
  }

  async getAccessToken(accessToken) {
    var accessToken = this.client.getAccessToken();
    if (!accessToken || !accessToken.access_token) {
      if (!this.query.code) {
        throw new Error('The code is empty')
      }
      accessToken = await this.client.getAccessToken(this.query.code)
    }
    return accessToken
  }


  setAccessToken(accessToken) {
    if (accessToken && !(accessToken instanceof Object)) {
      throw new Error('Token is not an object')
    }
    this.client.setAccessToken(accessToken);
    return this
  }


  get isAuthorize() {
    if (!this.query.code) {
      return false;
    }
    if (!this.query.state) {
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

  get state() {
    if (this._state === undefined) {
      this._state = Math.random().toString(36).substr(2) + Math.random().toString(36).substr(2);
    }
    return this._state
  }

  set state(state) {
    this._state = state
  }

  filterUserInfo = (userInfo) => {
    if (userInfo.gender == 'other' || userInfo.gender == 2 || userInfo.gender === '' || userInfo.gender == 'n') {
      delete userInfo.gender
    } else if (userInfo.gender === 0 || userInfo.gender === '0' || userInfo.gender == 'f') {
      userInfo.gender = 'female'
    } else if (userInfo.gender === 1 || userInfo.gender === '1' || userInfo.gender == 'm') {
      userInfo.gender = 'male'
    }

    if (!userInfo.username && userInfo.email) {
      userInfo.username = userInfo.email.split('@', 2)[0]
    }
    if (userInfo.username) {
      userInfo.username = userInfo.username.toLowerCase();
    }
    this._userInfo = userInfo;
    return this._userInfo
  }
}
