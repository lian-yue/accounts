if (__SERVER__) {
  module.exports = {
    qq: {
      name: 'QQ',
      clientId: '201432',
      clientSecret: '0bd62527def486c0b2ab777c7fa86048',
      scopes: [],
    },

    wechat: {
      name: '微信',
      clientId: 'gegHmh10iVkXXIay10HnFp37',
      clientSecret: 'd3An4nGzkDPkpFkxbTuQjykWGbAAbydv',
    },

    // http://developer.baidu.com/console#app/project
    // http://developer.baidu.com/console#app/create
    baidu: {
      name: '百度',
      clientId: 'gegHmh10iVkXXIay10HnFp37',
      clientSecret: 'd3An4nGzkDPkpFkxbTuQjykWGbAAbydv',
      scopes: ['basic'],
    },


    // http://open.weibo.com/webmaster/add
    // http://open.weibo.com/wiki/%E9%A6%96%E9%A1%B5
    weibo: {
      name: '微博',
      clientId: '3922125458',
      clientSecret: '3e79a4baa21b83f5ed6db00b9b98ef7a',
      scopes: ['all'],
    },


    // https://console.developers.google.com/
    // https://developers.google.com/oauthplayground/
    google: {
      name: 'Google',
      clientId: '571342589094-ve4ttpo9d0m2dq7qh4768tr0kieqtl26.apps.googleusercontent.com',
      clientSecret: 'aiMQuHzcS1XM320AsFDMa2Eh',
      scopes: ['https://www.googleapis.com/auth/plus.login', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    },


    // https://developers.facebook.com/apps/?action=create
    // https://developers.facebook.com/docs/facebook-login/permissions#permissions
    facebook: {
      name: 'Facebook',
      clientId: '1780136268893584',
      clientSecret: '9b56f6b649ebaae01235d290eb18d233',
      scopes: ['public_profile', 'email'],
    },


    // https://apps.twitter.com/app/new
    twitter: {
      name: 'Twitter',
      consumer_key: 'oRF0tt7wxmLEH1R1lcAdJ1XEP',
      consumer_secret: 'tMwBeDaNbApsu4QY8qIZzzENAAaJQfdUlID0A4gPo1lH8MVsKU',
    },
  }
} else {
  module.exports = {
    qq: {
      name: 'QQ',
    },

    wechat: {
      name: '微信',
    },

    baidu: {
      name: '百度',
    },


    // http://open.weibo.com/webmaster/add
    // http://open.weibo.com/wiki/%E9%A6%96%E9%A1%B5
    weibo: {
      name: '微博',
    },


    // https://console.developers.google.com/
    // https://developers.google.com/oauthplayground/
    google: {
      name: 'Google',
    },

    // https://developers.facebook.com/apps/?action=create
    // https://developers.facebook.com/docs/facebook-login/permissions#permissions
    facebook: {
      name: 'Facebook',
    },


    // https://apps.twitter.com/app/new
    twitter: {
      name: 'Twitter',
    },
  }
}
