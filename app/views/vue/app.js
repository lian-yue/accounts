/* @flow */
import Vue from 'vue'

import createStore from './store'
import createRouter from './router'
import createLocale from './locale'

import * as filters from './filters'
import * as components from './components'
import * as plugins from './plugins'

import App from './views/App'


for (let key in filters) {
  Vue.filter(key, filters[key])
}
for (let key in components) {
  Vue.component(key, components[key])
}

for (let key in plugins) {
  Vue.use(plugins[key])
}




export default function createApp() {
  const store = createStore()
  const router = createRouter(store)
  const locale = createLocale(store)

  const app = new Vue({
    store,
    router,
    locale,
    render: h => h(App)
  })

  return { store, locale, router, app }
}
