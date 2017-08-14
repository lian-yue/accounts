import crypto from 'crypto'
import cache from 'models/cache'
export default async function(ctx, next) {
  const oauth = ctx.state.token
  const column = ctx.params.column
  ctx.vmState(oauth.oauth.userInfo || {})
}
