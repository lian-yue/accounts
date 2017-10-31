/* @flow */

declare module 'config/cookie' {
  declare module.exports: {
    maxAge?: number, // milliseconds from Date.now() for expiry
    expires?: Date, // cookie's expiration date (expires at the end of session by default).
    path?: string, //  the path of the cookie (/ by default).
    domain?: string, // domain of the cookie (no default).
    secure?: boolean, // false by default for HTTP, true by default for HTTPS
    httpOnly?: boolean, //  a boolean indicating whether the cookie is only to be sent over HTTP(S),
    // and not made available to client JavaScript (true by default).
    signed?: boolean, // whether the cookie is to be signed (false by default)
    overwrite?: boolean, //  whether to overwrite previously set cookies of the same name (false by default).
  }
}


declare module 'config/mongodb' {
  declare module.exports: string
}

declare module 'config/oauth' {
  declare type exports = {
    scope: string[],
    scopes: string[],
    [key: string]: string,
  }
  declare module.exports: {
    qq: exports,
    wechat: exports,
    weibo: exports,
    baidu: exports,
    google: exports,
    facebook: exports,
    twitter: exports,
  }
}

declare module 'config/reserve' {
  declare module.exports: (value: any) => boolean
}


declare module 'config/site' {
  declare module.exports: {[key: string]: string}
}

declare module 'config/locale' {
  declare module.exports: {
    [key: string]: any,
  }
}
