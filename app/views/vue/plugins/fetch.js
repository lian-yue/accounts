/* @flow */
import type VueType from 'vue'
const mixin = {
  watch: {
    $route() {
      this.$fetch()
    }
  },
  mounted() {
    this.$fetch()
  },

  activated() {
    this.$fetch()
  },
}


export default {
  installed: false,
  install(Vue: Class<VueType>) {
    if (this.installed) {
      return
    }
    this.installed = true

    if (!Vue.prototype.$fetch) {
      Vue.mixin(mixin)
    }

    Vue.prototype.$fetch = function () {
      if (__SERVER__) {
        return
      }
      let options = this.$options
      if (!options || !options.fetch) {
        return
      }
      if (options.fetchName) {
        let fullPath = this.$store.state[options.fetchName].fullPath
        if (fullPath && this.$route.fullPath.split('#')[0] === fullPath.split('#')[0]) {
          return
        }
      }
      options.fetch(this.$store)
    }
    Vue.mixin(mixin)
  }
}
