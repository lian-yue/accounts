<template>
<div id="uauth-oauth-menu">
  <h2>{{$t('uauth.oauth.title', 'Use social account {method}', { method })}}</h2>
  <ul>
    <li v-for="(value, key) in oauth" :key="key">
      <router-link :to="{path: '/uauth/oauth/' + key, query: $props}" :class="'oauth-' + key" :title="$t('uauth.oauth.names.' + key, key)">{{$t('uauth.oauth.names.' + key, key)}}</router-link>
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

export default {
  props: {
    method: {
      type: String,
      default: 'login',
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
}
</script>
