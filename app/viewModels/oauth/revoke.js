export default async function (ctx) {
  var token = ctx.state.token
  token.set('deletedAt', new Date)
  await token.save()
  ctx.vmState(token, 204)
}
