import crypto from 'crypto'
import cache from 'models/cache'
export default async function(ctx, next) {
  const token = ctx.state.token
  const oauth = ctx.state.oauth
  const column = ctx.params.column

  var redirect_uri = await oauth.redirectUri()

  var selfRedirectKey = oauth.cacheKey + crypto.createHash('md5').update(oauth.state).digest("base64")
  var selfRedirectUri = ctx.request.query.redirect_uri || '/'

  await cache.multi().set(selfRedirectKey, selfRedirectUri).expire(selfRedirectKey, 3600).exec()
  ctx.vmState({redirect_uri})
}
