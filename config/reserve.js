let reserve = [
  'me',
  'all',
  'userauth',
  'black',
  'save',
  'select',
  'create',
  'update',
  'delete',
  'remove',
  'read',
  'editor',
  'index',
  'home',
  'default',
  'info',
  'noreply',
  'reply',
  'web',
  'get',
  'add',
  'set',
  'del',
  'put',
  'patch',
  'www',
  'user',
  'account',
  'vip',
  'log',
  'role',
  'post',
  'image',
  'file',
  'storage',
  'store',
  'slug',
  'tag',
  'date',
  'page',
  'sort',
  'skip',
  'order',
  'limit',
  'filter',
  'type',
  'name',
  'comment',
  'state',
  'status',
  'authorize',
  'auth',
  'oauth',
  'oauth2',
  'server',
  'token',
  'client',
  'mail',
  'email',
  'phone',
  'mobile',
  'base',
  'class',
  'app',
]


module.exports = function (_value) {
  let value = _value
  if (typeof value !== 'string' || value < 3) {
    return false
  }
  value = value.trim().toLocaleLowerCase()
  if (value.substr(-1, 1) === 's') {
    value = value.substr(0, value.length - 1)
  }
  return reserve.indexOf(value) === -1
}
