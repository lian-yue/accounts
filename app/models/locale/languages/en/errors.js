export default {
  // path, value
  default: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} is incorrect',

  // path
  required: 'The {translation("paths", path, path)} is required',

  // path, value
  enum: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} does not match',

  // path, value
  match: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} does not match',

  // path, value
  incorrect: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} is incorrect',


  // path, value, MAX
  min: 'The {translation("paths", path, path)} can not be less than {MIN}',
  // path, value, MIN
  max: 'The {translation("paths", path, path)} can not be greater than {MAX}',


  // path, value, minlength
  minlength: 'The {translation("paths", path, path)} can not be less than {minlength} bytes',
  // path, value, maxlength
  maxlength: 'The {translation("paths", path, path)} can not be greater than {maxlength} bytes',



  // path, value, minimum
  minimum: 'The minimum number of {translation("paths", path, path)} can not be less than {minimum}',
  // path, value, maximum
  maximum: 'The maximum number of {translation("paths", path, path)} can not be greater than {maximum}',


  // path value
  hasexist: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} already exists',
  // path value
  notexist: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} does not exist',



  // path, value
  notsame: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} is not the same',
  // path, value
  hassame: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} is the same',



  // path, value
  hasexpire: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} has expired',
  // path, value
  notexpire: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} not expired',




  // path, value
  notphone: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} can not be a mobile phone number',

  // path, value
  notid: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} can not be id',

  // path, value
  reserve: 'The {translation("paths", path, path)}{where(value, !=, "", ` {value}`)} is reserved by the system',


  // 取消
  cancel: 'The {translation("paths", path, path)} is canceled',

  // 超时
  timeout: 'The {translation("paths", path, path)} timeout',

  // reset, path, method
  ratelimit: '{date(reset, "diff")} you can {translation("methods", path, path)} the {translation("paths", path, path)}',


  notlogged: 'You are not logged in',
  haslogged: 'You are logged in',


  notself: 'You can not change yourself',

  permission: 'You do not have permission',

  // path, reason
  black: 'The {translation("paths", path, path)} is blacklisted{reason, " because {reason}"}',

  // path
  white: 'The {translation("paths", path, path)} is not on the white list',
}
