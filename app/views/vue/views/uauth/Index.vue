<template>
  <main id="uauth-index" role="main">
    <h1 id="logo">
      <a v-if="$route.query.application" :title="applicationRead.name" :href="applicationRead.homeUrl || '/'" :style="{'background-image':  applicationRead.logoUrl ? 'url('+ applicationRead.logoUrl +')' : 'none'}">{{applicationRead.name}}</a>
      <router-link v-else :title="site.title + ' - ' + site.description" rel="home" to="/">{{site.title}}</router-link>
    </h1>
    <router-view class="router-view"></router-view>
  </main>
</template>
<style lang="sass">
#uauth-index
  min-width: 250px
  max-width: 500px
  margin: 7% auto 0 auto
  .form-index
    padding: 1.5rem
    background: #fff
  #logo
    overflow: hidden
    width: 80px
    height: 80px
    margin: 0 auto 2rem auto
    a
      display: block
      width: 100%
      height: 100%
      line-height: 50
      border-radius: .6rem
      background: url(../../styles/images/logo.png) no-repeat 50%
      background-size: cover
  #menu
    padding: 0 1.5rem
    margin-bottom: 1rem
    ul
      margin: 0
      padding: 0
      list-style: none
      display: flex
      flex-wrap: wrap
      li
        text-align: center
        flex-basis: 50%
</style>
<script>
/* @flow */
import { mapState } from 'vuex'
import { APPLICATION_READ } from '../../store/types'
export default {

  computed: {
    ...mapState(['site', 'applicationRead'])
  },

  fetchName: 'applicationRead',

  async fetch(store) {
    const { state, dispatch } = store
    let route = state.route

    if (!route.query.application) {
      return
    }

    await dispatch({
      type: APPLICATION_READ,
      path: '/application/' + route.query.application,
      query: { cans: '' },
      fullPath: route.fullPath.split('#')[0],
      onState(application: Object) {
        if (application.status !== 'pending' && application.status !== 'approved') {
          let e = new Error('black')
          e.path = 'application'
          e.translate = true
          e.status = 403
          throw e
        }
        return application
      },
      onMessage(payload: Object) {
        delete payload.name
        payload.state.close = false
        return payload
      },
    })
  },
}
</script>
