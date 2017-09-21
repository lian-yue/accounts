import User from 'models/user'
import Auth from 'models/auth'
import Message from 'models/message'
import Verification from 'models/verification';

export default async function(ctx) {

  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  var id = String(params.id || '')
  var code = String(params.code || '').trim()

  var token = ctx.state.token
  var application = token.get('application')

  if (!id) {
    ctx.throw('ID 不能为空', 403)
  }
  var auth = await Auth.findById(id).populate({
    path: 'user',
    populate: [User.metaPopulate(true)]
  }).exec()

  if (!auth || auth.get('deletedAt') || ['email', 'phone'].indexOf(auth.get('column')) == -1) {
    ctx.throw('验证码不正确', 403)
  }

  var user = auth.get('user')

  var verification  = await Verification.findByCode({
    user,
    token,
    type: 'user_password',
    code,
    to: auth.get('value'),
    test: params.test,
  })

  if (!verification && ctx.app.env != 'development') {
    ctx.throw('验证码不正确', 403)
  }

  // 测试
  if (params.test) {
    ctx.vmState({});
    return;
  }

  var newPassword = String(params.new_password || '')
  var newPasswordAgain = String(params.new_password_again || '')


  user.set('password', newPassword);
  user.set('newPassword', newPassword);
  user.set('newPasswordAgain', newPasswordAgain);

  await user.save()



  var authorize
  if (application) {
    authorize = await Authorize.findOneCreate(user, application)
  }
  token.set('user', user)
  token.set('authorize', authorize)
  await token.save()


  var message = new Message({
    user,
    readOnly: true,
    type: 'user_save',
    data: {
      password: '***',
    },
    token,
  })
  await message.save()


  ctx.vmState(token)
}
