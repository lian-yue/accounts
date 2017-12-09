<template>
  <main id="user-index" role="main">
    <nav id="user-nav">
      <h1 id="user-nav-title">{{$t('user.nav.title', 'Navigation')}}</h1>
      <ul>
        <li>
          <router-link class="router-nav-home" :to="getTo('/')">{{$t('user.nav.home', 'Profile')}}</router-link>
        </li>
        <li>
          <router-link :to="getTo('/auth')">{{$t('user.nav.auth', 'Security')}}</router-link>
        </li>
        <li>
          <router-link :to="getTo('/message')">{{$t('user.nav.message', 'Message')}}</router-link>
        </li>
        <li>
          <router-link :to="getTo('/authorize')">{{$t('user.nav.authorize', 'Authorize')}}</router-link>
        </li>
        <li>
          <router-link :to="getTo('/application')">{{$t('user.nav.application', 'Application')}}</router-link>
        </li>
      </ul>
    </nav>
    <router-view class="router-view"></router-view>
  </main>
</template>
<style lang="sass">
@import "../../styles/variables"
@mixin user-index-mixin($value)
  @if map-has-key($value, color)
    color: map-get($value, color)
  @if map-has-key($value, bg)
    background: map-get($value, bg)

#user-index
  display: flex
  align-items: stretch
  min-height: 100%
  .router-view
    flex: auto
    align-items: stretch
    width: 100%
#user-nav
  background: map-get($user-nav, bg)
  flex: auto
  min-width: 180px
  #user-nav-title
    text-align: center
    margin: 0
    font-size: 1.4rem
    color: map-get($user-nav, color)
    margin: 0
    padding: .8rem 1rem
  ul
    list-style: none
    margin: 0
    padding: 0
    li
      display: block
      a
        @include user-index-mixin($user-nav)
        display: block
        text-decoration: none
        padding: .5rem 1rem
        @if map-has-key($user-nav, hover)
          &:hover
            @include user-index-mixin(map-get($user-nav, hover))
        &.router-nav-home.router-link-active
          @include user-index-mixin($user-nav)
        &.router-link-active,
        &.router-nav-home.router-link-exact-active,
          @include user-index-mixin(map-get($user-nav, active))
</style>
<script>
export default {
  methods: {
    getTo(path = '/') {
      let to = ''
      if (this.$route.params.user) {
        to += '/' + this.$route.params.user
      }
      to += path
      return to
    }
  }
}
</script>
