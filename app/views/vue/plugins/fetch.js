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
    Vue.prototype.$fetch = function () {
      if (__SERVER__) {
        return
      }
      let options = this.$options
      if (!options || !options.fetch) {
        return
      }
      if (options.fetchName && this.$route.fullPath.split('#')[0] === this.$store.state[options.fetchName].fullPath) {
        return
      }
      options.fetch(this.$store)
    }
    Vue.mixin(mixin)
  }
}
