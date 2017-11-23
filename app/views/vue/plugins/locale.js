/* @flow */
import Locale from 'models/locale'

import type VueType from 'vue'
const mixin = {
  beforeCreate() {
    let options: Object = this.$options
    if (options.locale && options.locale instanceof Locale) {
      this._locale = options.locale
    } else if (options.parent && options.parent.$locale) {
      this._locale = options.parent.$locale
    } else if (this.$root && this.$root._locale) {
      this._locale = this.$root._locale
    }
  }
}

export default {
  installed: false,
  install(Vue: Class<VueType>) {
    if (this.installed) {
      return
    }
    this.installed = true

    Vue.mixin(mixin)

    Object.defineProperty(Vue.prototype, '$locale', ({
      configurable: true,
      enumerable: false,
      get() {
        return this._locale
      }
    }: Object))

    Vue.prototype.$t = function (path: string | string[], defaultValue?: Object | string = {}, props?: Object = {}): string {
      return this._locale.translate(path, defaultValue, props)
    }
  }
}
