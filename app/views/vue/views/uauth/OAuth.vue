<template>
<div id="uauth-oauth">
  <form-index role="form" method="post" ref="form" @submit.prevent="onSubmit">
    <message/>
    <loading/>
  </form-index>
</div>
</template>



<script>
/* @flow */
import { mapState } from 'vuex'
import Loading from '../../components/Loading'
import FormIndex from '../../components/forms/Index'
import FormGroup from '../../components/forms/Group'
import FormButton from '../../components/forms/Button'
import FormInput from '../../components/forms/Input'


export default {
  components: {
    Loading,
    FormIndex,
    FormGroup,
    FormButton,
    FormInput,
  },
  computed: {
    redirect_uri() {
      return this.$route.query.redirect_uri || '/'
    },
    ...mapState(['site', 'token', 'applicationRead'])
  },
  methods: {
    async onSubmit() {
      // 11
    }
  },
  headers() {
    let title = this.$t('uauth.oauth.title', 'OAuth')
    return {
      title: [title, this.site.title],
      meta: [
        { name: 'robots', content: 'none' },
      ],
    }
  },
}
</script>
