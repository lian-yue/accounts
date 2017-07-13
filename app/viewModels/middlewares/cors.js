export default async function (ctx, application) {
  if (!ctx.response.get('Access-Control-Allow-Credentials')) {
    var requestOrigins = application.get('requestOrigins')
    ctx.set('Access-Control-Allow-Credentials', true)
    ctx.set('Access-Control-Allow-Methods', 'HEAD, OPTIONS, GET, PUT, PATCH, POST, DELETE')
    ctx.set('Access-Control-Allow-Headers', 'User-Agent, Keep-Alive, Range, If-Match, If-Modified-Since, If-None-Match, If-Range, If-Unmodified-Since, Content-Type, Accept, Content-Length, Content-MD5, Authorization, X-Token, X-Refresh-Token, X-Access-Token')

    ctx.set('Access-Control-Expose-Headers', 'Accept-Ranges, Content-Range, Cache-Control, Content-Length, Content-Disposition, Content-Language, Content-MD5, Content-Type, Expires, Last-Modified, WWW-Authenticate, ETag, Date')

    ctx.set('Access-Control-Max-Age', 3600)

    ctx.set('Access-Control-Allow-Origin', application.get('requestOrigins').join(', '))

    if (ctx.request.header.origin && application.get('requestOrigins').indexOf(ctx.request.header.origin) == -1) {
      // ctx.throw('Not allowed "Origin"', 403)
    }
  }

  if (ctx.method == 'OPTIONS') {
    ctx.body = ''
    return false
  }

  return true
}
