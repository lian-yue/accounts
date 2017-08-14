import crypto from 'crypto'
import cache from 'models/cache'
export default async function(ctx, next) {
  const token = ctx.state.token
  const column = ctx.params.column


  token.set('state.auth.' + column, void 0)
  await token.save()

  ctx.vmState({}, 204)
}
