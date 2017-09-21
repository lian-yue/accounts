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

function fetch() {
  if (__SERVER__) {
    return
  }
  if (!this.$options.fetch) {
    return
  }
  if (!this.$options.fetchName) {
    return
  }
  if (this.$route.fullPath.split('#')[0] == this.$store.state[this.$options.fetchName].fullPath) {
    return
  }
  this.$options.fetch(this.$store)
}


export default {
  install(Vue, options) {
    if (Vue.prototype.$fetch) {
      return
    }
    Vue.prototype.$fetch = fetch
    Vue.mixin(mixin)
  }
}
