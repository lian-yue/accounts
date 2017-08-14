import oauths from 'models/auth/oauth'
import oauthConfig from 'config/oauth'
export default async function(ctx, next) {
  const token = ctx.state.token
  const column = ctx.params.column || ''
  const OAuth = oauths[column]

  ctx.set('Cache-Control', 'no-cache,must-revalidate,max-age=0')

  if (!OAuth || !oauthConfig[column]) {
    ctx.throw('暂不支持', 404)
  }

  const oauth = new OAuth(ctx.query, ctx.request.protocol + '://' + ctx.host + ctx.path.replace(/[^\/]+\/?$/g, '') + 'callback')

  oauth.cacheKey = 'auth.oauth.' + column + token.get('id')
  oauth.column = column
  oauth.state = token.get('state.auth.' + column) || {}
  oauth.name = oauthConfig[column].name

  ctx.state.oauth = oauth


  await next()
}
