import Log from 'models/log'
import User from 'models/user'
import Auth from 'models/auth'
import Authorize from 'models/authorize'
import Verification from 'models/verification'

export default async function(ctx) {
  var validate
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  var username = String(params.username || '').trim()
  var nickname = String(params.nickname || '').trim() || username
  var password = String(params.password || '')
  var passwordAgain = String(params.password_again || '')
  var gender = String(params.gender || '').trim()
  var birthday = String(params.birthday || '').trim()
  var description = String(params.description || '')
  var locale = String(params.locale || 'en')



  var email = String(params.email || '').trim()
  var phone = String(params.phone || '').trim()
  var emailCode = String(params.email_code || '').trim()
  var phoneCode = String(params.phone_code || '').trim()
  var createType = String(params.create_type || '')

  var token = ctx.state.token
  var application = token.get('application')

  var user = new User({
    username,
    nickname,
    password,
    passwordAgain,
    gender,
    locale,
    birthday,
    description,
    application,
    registerIp: ctx.ip,
  });

  var authEmail;
  var authPhone;


  if (validate = user.validateSync()) {
    throw validate;
  }

  if (createType == 'email' || email) {
    authEmail = new Auth({
      column: 'email',
      value: email,
      user,
    });
  }

  if (createType == 'phone' || phone) {
    authPhone = new Auth({
      column: 'phone',
      value: phone,
      user,
    });
  }


  if (!authEmail && !authPhone) {
    ctx.throw('邮箱和手机必须选填一个', 403)
  }

  if (authEmail && (validate = authEmail.validateSync())) {
    throw validate;
  }

  if (authPhone && (validate = authPhone.validateSync())) {
    throw validate;
  }

  if (authEmail && !emailCode) {
    ctx.throw('邮箱验证码不能为空', 403);
  }

  if (authPhone && !phoneCode) {
    ctx.throw('短信验证码不能为空', 403);
  }

  if (validate = await user.validate()) {
    throw e;
  }


  if (authEmail && (validate = await authEmail.validate())) {
    throw validate;
  }

  if (authPhone && (validate = await authPhone.validate())) {
    throw validate;
  }


  if (authEmail && ctx.app.env != 'development') {
    let verification  = await Verification.findByCode({
      token,
      type: 'auth_create',
      code: emailCode,
      to: authEmail.get('value'),
      toType: 'email',
    });
    if (!verification) {
      ctx.throw('邮箱验证码不正确', 403);
    }
  }

  if (authPhone && ctx.app.env != 'development') {
    let verification  = await Verification.findByCode({
      token,
      type: 'auth_create',
      code: phoneCode,
      to: authPhone.get('value'),
      toType: 'sms',
    });
    if (!verification) {
      ctx.throw('短信证码不正确', 403);
    }
  }

  await user.save()
  if (params.avatar) {
    try {
      user.set('avatar', avatar)
      await user.save()
    } catch (e) {
    }
  }


  await user.populate(User.metaPopulate(true)).execPopulate()

  if (authEmail) {
    await authEmail.save();
  }

  if (authPhone) {
    await authPhone.save();
  }


  var authorize
  if (application) {
    authorize = await Authorize.findOneCreate(user, application)
  }
  token.set('user', user)
  token.set('authorize', authorize)
  await token.save()

  var log = new Log({
    user,
    token,
    application,
    userAgent: ctx.request.header['user-agent'] || '',
    path: 'auth/login',
    ip: ctx.ip,
    create: true,
  })
  await log.save()

  ctx.status = 201
  ctx.vmState(token)
}
