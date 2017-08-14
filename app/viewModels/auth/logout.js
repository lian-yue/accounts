export default async function(ctx) {
  var token = ctx.state.token
  token.set('deletedAt', new Date)
  await token.save()
  if (!token.get('application')) {
    ctx.cookies.set('access_token', 'deleted',  {...cookieConfig, expires: new Date('1970-02-01'), path:'/', httponly: true});
  }
  ctx.vmState(token, 204)
}
