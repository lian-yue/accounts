import Vue from 'vue'
import Router from 'vue-router'

Vue.use(Router)


const router = new Router({
  mode: 'history',
  fallback: false,
  scrollBehavior()  {
    return { y: 0 }
  },
  routes: [
    {
      path: '/auth',
      component: () => import('./views/auth/Index'),
      children: [
        {
          path: '',
          component: () => import('./views/auth/Login'),
        },
        {
          path: 'login',
          component: () => import('./views/auth/Login'),
        },
        {
          path: 'create',
          component: () => import('./views/auth/Create'),
        },
        {
          path: 'password',
          component: () => import('./views/auth/Password'),
        },
        {
          path: 'oauth',
          component: () => import('./views/auth/OAuth'),
        },
      ],
    },
    /*{
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
    },*/
    {
      path: '*',
      component: () => import('./views/errors/NotFound'),
    },
  ]
})
export default router
