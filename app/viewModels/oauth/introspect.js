export default async function (ctx) {
  var token = ctx.state.token
  var state = token.toJSON()
  ctx.vmState({
    ...token.toJSON(),
    active: true,
    client_id: token.get('application').get('id'),
    application_id: token.get('application').get('id'),
  })
}
