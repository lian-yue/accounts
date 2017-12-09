<template>
  <div id="user-read">
    <table>
      <tbody>
        <tr>
          <th>{{$t('user.read.id', 'ID')}}</th>
          <td>{{userRead.id || ''}}</td>
        </tr>
        <tr>
          <th>{{$t('user.read.username', 'Username')}}</th>
          <td>{{userRead.username || ''}}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
<style lang="sass">
</style>
<script>
/* @flow */
import { mapState } from 'vuex'
import { USER_READ } from '../../store/types'
export default {
  computed: {
    ...mapState(['site', 'userRead'])
  },

  fetchName: 'userRead',

  async fetch(store) {
    const { state, dispatch } = store
    let route = state.route
    await dispatch({
      type: USER_READ,
      path: '/' + route.params.user,
    })
  },

  headers() {
    let title = this.$t('uauth.user.profile', 'Profile')
    return {
      title: [title, this.site.title],
      meta: [
        { name: 'robots', content: 'none' }
      ],
    }
  }
}
</script>
