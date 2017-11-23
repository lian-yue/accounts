export default {
  // path, value
  default: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} is incorrect',

  // path
  required: 'The {translate("paths", path, path)} is required',

  // path, value
  enum: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} does not match',

  // path, value
  match: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} does not match',

  // path, value
  incorrect: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} is incorrect',


  // path, value, MAX
  min: 'The {translate("paths", path, path)} can not be less than {MIN}',
  // path, value, MIN
  max: 'The {translate("paths", path, path)} can not be greater than {MAX}',


  // path, value, minlength
  minlength: 'The {translate("paths", path, path)} can not be less than {minlength} bytes',
  // path, value, maxlength
  maxlength: 'The {translate("paths", path, path)} can not be greater than {maxlength} bytes',



  // path, value, minimum
  minimum: 'The minimum number of {translate("paths", path, path)} can not be less than {minimum}',
  // path, value, maximum
  maximum: 'The maximum number of {translate("paths", path, path)} can not be greater than {maximum}',


  // path value
  hasexist: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} already exists',
  // path value
  notexist: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} does not exist',



  // path, value
  notsame: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} is not the same',
  // path, value
  hassame: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} is the same',



  // path, value
  hasexpire: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} has expired',
  // path, value
  notexpire: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} not expired',




  // path, value
  notphone: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} can not be a mobile phone number',

  // path, value
  notid: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} can not be id',

  // path, value
  reserve: 'The {translate("paths", path, path)}{where(value, !=, "", ` {value}`)} is reserved by the system',


  // path
  cancel: 'The {translate("paths", path, path)} is canceled',

  // path
  timeout: 'The {translate("paths", path, path)} timeout',

  // path
  retry: '{firstUpperCase(`translate("paths", path, path)`)} error, please try again',

  // reset, path, method
  ratelimit: '{date(reset, "diff")} you can {translate("paths", method, method)} the {translate("paths", path, path)}',


  notlogged: 'You are not logged in',
  haslogged: 'You are logged in',


  notself: 'You can not change yourself',

  permission: 'You do not have permission',

  // path, reason
  black: 'The {translate("paths", path, path)} is blacklisted{reason, " because {reason}"}',

  // path
  white: 'The {translate("paths", path, path)} is not on the white list',
}
