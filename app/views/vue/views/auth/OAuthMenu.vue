<template>
<div id="oauth">
  <h2>使用社交账号{{name}}</h2>
  <ul>
    <li v-for="(value, key) in oauth">
      <a href="#" @click.prevent="login(key)" :title="value.name">{{value.name}}</a>
    </li>
  </ul>
</div>
</template>
<script>
import oauth from 'config/oauth'


export default {
  props: {
    type: {
      type: String,
      default: 'login',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    redirect_uri: {
      type: String,
      default: '/',
    },
  },

  data() {
    return {
      loading: false,
      oauth,
    }
  },

  computed: {
    name() {
      switch (this.type) {
        case 'auth':
          return '绑定'
          break;
        case 'create':
          return '注册'
          break;
        default:
          return '登录'
      }
    },
  },

  methods: {
    async login(key) {
      if (this.disabled || this.loading) {
        return
      }

      const commit = this.$store.commit
      try {
        this.loading = true
        var redirect_uri = '/auth/oauth/' + key + '/?redirect_uri=' + encodeURIComponent(this.redirect_uri) + '&type=' + encodeURIComponent(this.type);
        var result = await commit.fetch('/auth/oauth/' + key + '/login', {redirect_uri})
        window.location.href = result.redirect_uri
      } catch (e) {
        e.name = 'popup'
        commit(e)
      } finally {
        this.loading = false
      }
    },
  }
}
</script>
