<template>
<div id="uauth-oauth-menu">
  <h2>{{$t('uauth.oauth.title', 'Use social account {method}', { method })}}</h2>
  <ul>
    <li v-for="(value, key) in oauth">
      <a href="#" @click.prevent="login(key)" :class="'oauth-' + key" :title="$t('uauth.oauth.names.' + key, key)">{{$t('uauth.oauth.names.' + key, key)}}</a>
    </li>
  </ul>
</div>
</template>
<style lang="sass">
#uauth-oauth-menu
  background: #fff
  padding: 1.2rem 1.5rem
  margin-bottom: 2rem
  h2
    text-align: center
    margin: 0
  ul
    padding: 0
    list-style: none
    display: flex
    flex-wrap: wrap
    li
      padding: .3rem
      text-align: center
      flex-basis: 50%
</style>
<script>
/* @flow */
import oauth from 'config/oauth'
import { MESSAGE } from '../../store/types'


export default {
  props: {
    method: {
      type: String,
      default: 'login',
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    rememberme: {
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
  },

  methods: {
    async login(key) {
      if (this.disabled || this.loading) {
        return
      }

      const store = this.$store
      try {
        this.loading = true
        let redirect_uri = '/uauth/oauth/' + key + '/?method=' + this.method + (this.rememberme ? '&rememberme=true' : '') + '&redirect_uri=' + encodeURIComponent(this.redirect_uri)
        let result = await store.fetch('POST', '/uauth/oauth/' + key + '/login', { }, { redirect_uri })
        window.location.href = result.redirectUri
      } catch (e) {
        store.commit({ type: MESSAGE, name: 'popup', message: e })
      } finally {
        this.loading = false
      }
    },
  }
}
</script>
