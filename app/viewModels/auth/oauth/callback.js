import url from 'url'
import crypto from 'crypto'
import querystring from 'querystring'

import cache from 'models/cache'

export default async function(ctx) {
  const token = ctx.state.token
  const oauth = ctx.state.oauth
  const column = ctx.params.column

  if (ctx.query.state) {
    oauth.state = ctx.query.state
  } else if (ctx.query.oauth_token) {
    oauth.state = ctx.query.oauth_token
  }

  var redirectKey = oauth.cacheKey + crypto.createHash('md5').update(oauth.state).digest("base64")
  var redirectUri = await cache.get(redirectKey)
  await cache.del(redirectKey)


  if (!redirectUri && ctx.app.env != 'development') {
    ctx.throw('认证超时', 302, {redirect: '/auth/login?message=oauth_timeout'})
  }

  var redirectUri = url.parse(redirectUri || '/')

  delete redirectUri.auth
  redirectUri.hostname = ctx.request.hostname
  redirectUri.protocol = ctx.request.protocol
  redirectUri.port = ctx.request.port
  redirectUri.host = ctx.request.host
  redirectUri.query = urlObject.query ? querystring.parse(urlObject.query) : {}


  // 取消认证
  if (!oauth.isAuthorize) {
    redirectUri.query.message = 'oauth_cancel'
    redirectUri.query = querystring.stringify(redirectUri.query)
    redirectUri.search = '?' + redirectUri.query
    ctx.throw('取消认证', 302, {redirect: url.format(redirectUri)})
  }



  // 认证
  try {
    var accessToken = await oauth.getAccessToken()
    var userInfo = await oauth.getUserInfo()
  } catch (e) {
    e.status = e.status || e.code
    redirectUri.query.message = 'oauth_token'
    redirectUri.query = querystring.stringify(redirectUri.query)
    redirectUri.search = '?' + redirectUri.query
    e.redirect = url.format(redirectUri)
    throw e
  }


  token.set('state.auth.' + column, {accessToken, userInfo, createdAt: new Date})
  await token.save()

  // 成功重定向
  redirectUri.query.oauth = column
  redirectUri.query.message = 'success'
  redirectUri.query = querystring.stringify(redirectUri.query);
  redirectUri.search = '?' + redirectUri.query
  ctx.redirect(url.format(redirectUri))
}
