import User from 'models/user'
import tokenMiddleware from 'viewModels/middlewares/token'
const accessToken = tokenMiddleware({
  types: ['access'],
  user: true,
  required: false,
})

export default async function (ctx, next) {
  if (ctx.params.user) {
    if (ctx.params.user == 'me') {
      if (!ctx.state.token) {
        await accessToken(ctx)
      }
      ctx.state.user = ctx.state.token.get('user')
    } else {
      ctx.state.user = await User.findByAuth(ctx.params.user, ['username', 'id'])
    }
    if (!ctx.state.user) {
      ctx.throw('用户不存在', 404)
    }
  } else {
    delete ctx.state.user
  }
  await next()
}
