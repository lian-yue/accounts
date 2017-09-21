/* @flow */

declare type accessTokenType = {
  oauth_token?: string,
  oauth_token_secret?: string,


  access_token?: string,
  refresh_token?: string,
  token_type?: string,
  expires_in?: number,

  created_at?: Date,
  openid?: string,
}
