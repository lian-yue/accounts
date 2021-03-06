/* @flow */
import Vue from 'vue'
import Router from 'vue-router'
import { sync } from 'vuex-router-sync'

Vue.use(Router)


export default function createRouter(store: Object): Router {
  const router = new Router({
    mode: 'history',
    fallback: false,
    scrollBehavior(to: Object, from: Object, savedPosition: Object): Object {
      if (savedPosition) {
        return savedPosition
      } else if (to.hash) {
        return { x: 0, y: 0 }
      } else {
        return { x: 0, y: 0 }
      }
    },
    routes: [
      {
        path: '/uauth',
        component: () => import('./views/uauth/Index'),
        children: [
          {
            path: '',
            component: () => import('./views/uauth/Login'),
            meta: {
              user: false,
            },
          },
          {
            path: 'login',
            component: () => import('./views/uauth/Login'),
            meta: {
              user: false,
            },
          },
          {
            path: 'create',
            component: () => import('./views/uauth/Create'),
            meta: {
              user: false,
            },
          },
          {
            path: 'password',
            component: () => import('./views/uauth/Password'),
            meta: {
              user: false,
            },
          },
          {
            path: 'oauth/:column',
            component: () => import('./views/uauth/OAuth'),
          },
        ],
      },
      {
        path: '/:user',
        component: () => import('./views/user/Index'),
        children: [
          {
            path: '',
            component: () => import('./views/user/Read'),
            meta: {
              user: true,
            },
          },
          {
            path: 'save',
            component: () => import('./views/user/Save'),
            meta: {
              user: true,
            },
          },
          {
            path: 'auth',
            component: () => import('./views/auth/Index'),
            children: [
              {
                path: '',
                component: () => import('./views/auth/List'),
                meta: {
                  user: true,
                },
              },
              {
                path: ':auth',
                component: () => import('./views/auth/Read'),
                meta: {
                  user: true,
                },
              },
              {
                path: ':auth/save',
                component: () => import('./views/auth/Save'),
                meta: {
                  user: true,
                },
              },
            ]
          },
        ]
      },
      {
        path: '*',
        component: () => import('./views/errors/NotFound'),
      },
      {
        path: '/',
        redirect: '/me',
        meta: {
          user: true,
        },
      },
      /*
      {
        path: '/:username',
        component: () => import('./views/user/Index'),
        children: [
          {
            path: '',
            component: () => import('./views/user/Save'),
          },
          {
            path: '/message',
            component: () => import('./views/user/message/Index'),
            children: [
              {
                path: '',
                component: () => import('./views/user/message/List'),
              },
              {
                path: '/save',
                component: () => import('./views/user/message/Save'),
              },
              {
                path: '/:id',
                component: () => import('./views/user/message/Read'),
              },
            ]
          },
          {
            path: '/auth',
            component: () => import('./views/user/auth/Index'),
            children: [
              {
                path: '',
                component: () => import('./views/user/auth/List'),
              },
              {
                path: '/save',
                component: () => import('./views/user/auth/Save'),
              },
              {
                path: '/:id',
                component: () => import('./views/user/auth/Read'),
              },
              {
                path: '/:id/save',
                component: () => import('./views/user/auth/Save'),
              },
            ]
          },
          {
            path: '/authorize',
            component: () => import('./views/user/authorize/Index'),
            children: [
              {
                path: '',
                component: () => import('./views/user/authorize/List'),
              },
              {
                path: '/:id',
                component: () => import('./views/user/authorize/Read'),
              },
            ]
          },
          {
            path: '/application',
            component: () => import('./views/user/application/Index'),
            children: [
              {
                path: '',
                component: () => import('./views/user/application/List'),
              },
              {
                path: '/save',
                component: () => import('./views/user/application/Save'),
              },
              {
                path: '/:id',
                component: () => import('./views/user/application/Read'),
              },
              {
                path: '/:id/save',
                component: () => import('./views/user/application/Save'),
              },
            ]
          },
        ]
      },
      */
    ]
  })

  // 登录判断
  router.beforeEach(function (to, from, next) {
    if (to.meta.user && !store.state.token.user) {
      next({
        path: '/uauth',
        query: { message: 'notlogged', redirect_uri: to.fullPath }
      })
    } else if (to.meta.user === false && store.state.token.user) {
      next({
        path: to.query.redirect_uri || '/',
        query: { message: 'haslogged' }
      })
    } else {
      next()
    }
  })

  sync(store, router)
  return router
}
