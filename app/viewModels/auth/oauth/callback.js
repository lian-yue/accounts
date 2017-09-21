import url from 'url'
import crypto from 'crypto'
import querystring from 'querystring'

import cache from 'models/cache'

export default async function(ctx) {
  const token = ctx.state.token
  const oauth = ctx.state.oauth
  const column = ctx.params.column

  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  if (params.state) {
    oauth.state = params.state
  } else if (params.oauth_token) {
    oauth.state = params.oauth_token
  }

  var redirectKey = oauth.cacheKey + crypto.createHash('md5').update(oauth.state).digest("base64")
  var redirectUri = await cache.get(redirectKey)
  await cache.del(redirectKey)


  if (!redirectUri && ctx.app.env != 'development') {
    ctx.throw('认证超时', 403, {timeout: true})
  }

  // 取消认证
  if (!oauth.isAuthorize) {
    ctx.throw('取消认证', 403, {cancel: true, redirectUri})
  }

  // 认证
  try {
    var accessToken = await oauth.getAccessToken()
    var userInfo = await oauth.getUserInfo()
  } catch (e) {
    e.redirectUri = redirectUri
    e.status = e.status || e.code
    e.token = true
    throw e
  }


  token.set('state.auth.' + column, {accessToken, userInfo, createdAt: new Date})
  await token.save()

  // 成功重定向
  ctx.vmState({
    userInfo,
    redirectUri,
  })
}
