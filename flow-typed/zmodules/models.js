/* @flow */
/* global AccessToken */
declare type AccessToken = {
  oauth_token?: string,
  oauth_token_secret?: string,


  access_token?: string,
  refresh_token?: string,
  token_type?: string,
  expires_in?: number,

  created_at?: Date,
  openid?: string,
};


declare class Model extends Mongoose$Document {
  oncePost(fn: Function | Mongoose$Document, ignoreError?: boolean): this,

  setToken(token?: void | TokenModel): this,

  getToken(): void | this,

  can(name: string, opts?: Object): Promise<void>,
  canBoolean(name: string, opts?: Object): Promise<boolean>,
}



declare class TokenModel extends Model {
  secret: string,
  type: string,
  scopes: string[],
  renewal: number,
  client: boolean,

  parent?: MongoId | TokenModel,
  user?: MongoId | UserModel,
  authorize?: MongoId | AuthorizeModel,
  application?: MongoId | ApplicationModel,

  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date,
  expiredAt: Date,
  state: Object,
  logs: Array<{_id: MongoOrScalarId, id: string | number, ip: string, userAgent: string}>,

  userAgent: string,
  ip: string,
  expires_in: number,
  token_type: string,
  scope: string[],

  updateLog(ctx: Object, server?: boolean): boolean,
  canScope(
    token?: TokenModel,
    opts?: {
      path: string,
      admin?: boolean,
      client?: boolean,
      application?: boolean,
    }
  ): Promise<void>,
  canUser(
    token?: TokenModel,
    opts?: {
      value?: boolean | UserModel | MongoId | string,
      admin?: boolean,
      black?: boolean,
    }
  ): Promise<void>,
  canApplication(
    token?: TokenModel,
    opts?: {
      value?: boolean
    }
  ): Promise<void>,
}


declare class UserModel extends Model {
  static refPopulate(path: string | Object): Object,
  static metaPopulate(all?: boolean): Object,
  static findByAuth(val: any, columns?: string[]): Promise<this | void>,

  username: string,
  nickname: string,
  password: string,
  locale: string,

  creator?: MongoId | UserModel,
  updater?: MongoId | UserModel,
  application?: MongoId | ApplicationModel,

  createdAt: Date,
  updatedAt: Date,
  meta: MongoId | MetaModel,

  reason?: string,
  admin: boolean,
  black: boolean,
  auths: string[],
  registerIp?: string,
  nickname: string,
  avatar: string,
  preAvatar?: boolean,
  description: string,
  gender: string,
  birthday?: Date,
  url: string,

  oldPassword?: string,
  passwordAgain?: string,
  newPassword?: string,
  newPasswordAgain?: string,

  comparePassword(password: any): Promise<boolean>,
  canHasAdmin(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canNotBlack(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canLogin(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canOauth(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canList(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canRead(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canSave(
    token?: TokenModel,
    opts?: {
      username?: boolean,
      password?: boolean,
    }
  ): Promise<void>,

  canAdmin(
    token?: TokenModel,
    opts?: {
      value?: boolean
    }
  ): Promise<void>,

  canBlack(
    token?: TokenModel,
    opts?: {
      value?: boolean
    }
  ): Promise<void>,
}



declare class MetaModel extends Model {
  message: number
}

declare class AuthModel extends Model {
  user: MongoId | UserModel,
  column: string,
  value: string,
  token: Object,
  state: Object,
  settings: Object,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date,


  display: string,


  canNotDelete(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canList(
    token?: TokenModel,
    opts?: {
      deletedAt?: boolean,
    }
  ): Promise<void>,

  canRead(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canSave(
    token?: TokenModel,
    opts?: {

    }
  ): Promise<void>,

  canDelete(
    token?: TokenModel,
    opts?: {
      verification?: boolean,
    }
  ): Promise<void>,


}


declare class ApplicationModel extends Model {
  static createRandom(length?: number, lower?: boolean): string,
  static forwardUserAgent <T>(ctx: Object, def: T): T | string,
  static forwardIp <T>(ctx: Object, def: T): T | string,
  canScope(
    token?: TokenModel,
    opts?: {
      path: string,
    }
  ): Promise<void>,
  canNotDelete(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canList(
    token?: TokenModel,
    opts?: {
      deletedAt?: boolean,
      status?: string,
    }
  ): Promise<void>,
  canRead(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canSave(
    token?: TokenModel,
    opts?: {
      auths?: {
        password?: boolean,
        implicit?: boolean,
        cors?: boolean
      },
      scope?: string,
    }
  ): Promise<void>,
  canStatus(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canDelete(
    token?: TokenModel,
    opts?: {
      value?: boolean
    }
  ): Promise<void>,
  canAllowedIp(
    token?: TokenModel,
    opts?: {
      ip?: string
    }
  ): Promise<void>,
  secret: string,
  status: string,
  name: string,
  slug?: string,
  content?: string,
  auths: { implicit: boolean, password: boolean, cors: boolean },
  scopes: string[],
  homeUrl?: string,
  logoUrl?: string,
  pushUrl?: string,
  requestOrigins: string[],
  redirectUris: string[],
  allowedIps: string[],
  reason?: string,
  application: MongoId | UserModel,
  creator?: MongoId | UserModel,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date,
}



declare class AuthorizeModel extends Model {
  user: MongoId | UserModel,
  application: MongoId | ApplicationModel,
  roles: Array<{
    role: MongoId | RoleModel,
    reason?: string,
    createdAt: Date,
    expiredAt?: Date
  }>,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date,
  [key: string]: any,
  constructor(data?: Object): this,
  set(data: Object): this,
  set(path: string, val: any, type?: any, options?: Object): this,


  static findOneCreate(user: MongoId | UserModel, application: MongoId | ApplicationModel): Promise<this>,

  canNotDelete(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canList(
    token?: TokenModel,
    opts?: {
      deletedAt?: boolean,
    }
  ): Promise<void>,
  canRead(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canSave(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canClear(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canDelete(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
}

declare class RoleModel extends Model {
  level: number,
  name: string,
  application: MongoId | ApplicationModel,
  content: string,
  children: Array<MongoId | this>,
  rules: Array<{_id: MongoOrScalarId, id: string | number, scope: string, state: number}>,
  createdAt: Date,
  updatedAt: Date,
  deletedAt?: Date,
  getApplication(): Promise<ApplicationModel>,
  canList(
    token?: TokenModel,
    opts?: {
      deletedAt?: boolean,
    }
  ): Promise<void>,
  canRead(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canSave(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canDelete(
    token?: TokenModel,
    opts?: {
      value?: boolean
    }
  ): Promise<void>,
}



declare class MessageModel extends Model {
  user: MongoId | UserModel,
  contact: MongoId | UserModel,
  creator?: MongoId | UserModel,
  application?: MongoId | ApplicationModel,
  type: string,
  message: string,
  userAgent: string,
  token?: MongoId | TokenModel,
  ip?: string,
  readAt?: Date,
  createdAt: Date,
  deletedAt?: Date,
  readOnly: boolean,

  constructor(data?: Object): this,
  set(data: Object): this,
  set(path: string, val: any, type?: any, options?: Object): this,

  canNotDelete(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canList(
    token?: TokenModel,
    opts?: {
      deletedAt?: boolean,
    }
  ): Promise<void>,
  canClear(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canRead(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canSave(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
  canDelete(
    token?: TokenModel,
    opts?: {
    }
  ): Promise<void>,
}


declare class VerificationModel extends Model {
  static findByCode(options: {
    token: MongoId | TokenModel,
    type: string,
    code: string,
    user?: MongoId | UserModel,
    to?: string,
    toType?: string,
    test?: boolean,
  }): Promise<void | null | this>,

  ip: string,
  token: MongoId | TokenModel,
  user: MongoId | UserModel,
  type: string,
  to: string,
  toType: string,
  code: string,
  error: number,
  usedAt?: Date,
  nickname: string,
  used: string,
  createdAt: Date,
  expiredAt: Date,

}
