import User from 'models/user'
import Auth from 'models/auth'
import Message from 'models/message'
import Authorize from 'models/authorize'
import Verification from 'models/verification'
import oauthConfig from 'config/oauth'

export default async function(ctx) {
  var validate
  var params = {
    ...ctx.request.query,
    ...ctx.request.body,
  }

  var column = String(params.column || '').toLowerCase().trim()
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

  var auths = []
  var authOauth
  var authEmail
  var authPhone


  if (validate = user.validateSync()) {
    throw validate;
  }

  if (createType == 'email' || email) {
    authEmail = new Auth({
      column: 'email',
      value: email,
      user,
    });
    auths.push(authEmail)
  }

  if (createType == 'phone' || phone) {
    authPhone = new Auth({
      column: 'phone',
      value: phone,
      user,
    });
    auths.push(authPhone)
  }

  if (createType == 'column' || column) {
    if (!oauthConfig[column]) {
      ctx.throw('认证字段不正确', 403)
    }
    let state = token.get('state.auth.' + column)
    let userInfo = state.userInfo
    if (!userInfo || !userInfo.id || (Date.now() - 1800 * 10000) > state.createdAt.getTime()) {
      ctx.throw('未登录认证帐号', 403, {column: true})
    }

    authOauth =  new Auth({
      column,
      value: userInfo.id,
      user,
      token: state.accessToken,
      state: state.userInfo,
    })

    token.set('state.auth.' + column, void 0)
    auths.push(authOauth)


    // 没 email  自动添加
    if (!authEmail && userInfo.email && !(await Auth.findOne({column: 'email', value: userInfo.email}).exec())) {
      auths.push(new Auth({
        column: 'email',
        value: userInfo.email,
        user,
      }))
    }

    // 取消密码设置
    if (!params.password && params.password == void 0) {
      user.set('password', void 0)
      user.set('passwordAgain', void 0)
    }
  }


  if (!auths.length) {
    ctx.throw('必须选择一个验证方式', 403)
  }

  for (let i = 0; i < auths.length; i++) {
    if (validate = auths[i].validateSync()) {
      throw validate
    }
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

  for (let i = 0; i < auths.length; i++) {
    if (validate = await auths[i].validate()) {
      throw validate;
    }
  }

  if (authEmail && ctx.app.env != 'development') {
    let verification  = await Verification.findByCode({
      token,
      type: 'user_save',
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
      type: 'user_save',
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

  try {
    for (let i = 0; i < auths.length; i++) {
      await auths[i].save()
    }
  } catch (e) {
    ctx.app.emit('error', e, ctx)
  }

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
    create: true,
    column: column || void 0,
    token,
  })
  await message.save()

  var message = new Message({
    user,
    readOnly: true,
    type: 'user_login',
    column: column || void 0,
    token,
  })
  await message.save()

  ctx.vmState(token, 201)
}
