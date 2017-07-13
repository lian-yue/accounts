export default async function(ctx, next) {
  await next()
  // ctx.type = 'json'
  // await ctx.viewModel('POST', '/token', {}, {grant_type: ''})
  // // console.log(111)
  // var user = new User({
  //   password: 'www',
  // })
  // await user.save()
  // // ctx.body = JSON.stringify()


  // await next()
}
