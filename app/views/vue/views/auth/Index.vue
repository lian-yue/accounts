<template>
  <main id="auth-index" role="main">
    <router-view></router-view>
  </main>
</template>
<style lang="sass">
#auth-index
  min-width: 250px
  max-width: 750px
  margin: 8% auto 0 auto
  #logo
    overflow: hidden
    width: 80px
    height: 80px
    margin: 0 auto 1rem auto
    a
      display: block
      width: 100%
      height: 100%
      line-height: 50
      border-radius: .6rem
      background: url(../../styles/images/logo.png) no-repeat 50%
      background-size: cover
</style>
<script>
import { APPLICATION_READ } from '../../store/types'
export default {
  fetchName: 'applicationRead',
  async fetch(store) {
    const {state, dispatch, commit} = store
    var route = state.route

    if (!route.query.application) {
      return
    }
    var redirectUri = route.query.redirect_uri

    await dispatch({
      type: APPLICATION_READ,
      path: '/application/' + route.query.application,
      query: {cans: ''},
      fullPath: route.fullPath.split('#')[0],
      onState(state)  {
        if (!redirectUri || state.redirectUris.indexOf(redirectUri) == -1) {
          var e = new Message('"redirect_uri" 无效');
          e.status = 400
          throw e
        }
        return state
      },
      onMessages(e) {
        delete e.name
        e.canClose = false
        return e
      },
    })
  },
}
</script>
