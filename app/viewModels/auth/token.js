import Token from 'models/token'
import cookieConfig from 'config/cookie'
import tokenMiddleware from 'viewModels/middlewares/token'

const accessToken = tokenMiddleware({
  types: ['access'],
  cookie: true,
})

export default async function (ctx, next) {
  var token
  var application = ctx.state.application
  try {
    token = await accessToken(ctx)
    ctx.state.rateLimit = false
  } catch (e) {
  }

  if (!token) {
    var scopes = ['**']
    if (application) {
      scopes = params.scopes || params.scope
      if (typeof scopes == 'undefined') {
        scopes = application.get('scopes')
      } else {
        if (!Array.isArray(scopes)) {
          scopes = String(scopes).split(' ').map(scope => scope.trim()).filter(scope => scope)
        }
        for (let i = 0; i < scopes.length; i++) {
          let scope = scopes[i]
          if (!application.canScope(scope)) {
            ctx.throw(`"scope.${scope}" no permission`, 400, {code: 'invalid_scope'})
          }
        }
      }
    }


    var expiredAt = new Date
    expiredAt.setTime(expiredAt.getTime() + 1000 * 86400 * 30)

    token = new Token({
      expiredAt,
      scopes,
      application,
    });
  }


  token.updateLog(ctx)
  var isNew = token.isNew
  if (isNew || token.isModified()) {
    await token.save()
    if (!application) {
      ctx.cookies.set('access_token', token.get('id') + token.get('key'),  {...cookieConfig, expires: token.get('expiredAt'), path:'/', httponly: true});
    }
  }

  ctx.vmState({
    ...token.toJSON(),
    access_token: isNew && application ? token.get('id') + token.get('key') : undefined,
  })
}
