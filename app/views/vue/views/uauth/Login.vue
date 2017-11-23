<template>
<div id="uauth-login">
  <form-index role="form" method="post" ref="form" @submit.prevent="onSubmit">
    <message/>
    <form-group>
      <label for="username">{{$t('paths.username', 'Username')}}:</label>
      <form-input name="username" id="username" :validate="true" ref="username" v-model="username" type="text" required maxlength="64" :placeholder="$t('uauth.login.placeholder.username', 'Please enter username / e-mail / phone')" :block="true"></form-input>
    </form-group>
    <form-group>
      <label for="password">{{$t('paths.password', 'Password')}}:</label>
      <form-input name="password" id="password" :validate="true" ref="password" v-model="password" type="password" required maxlength="64" :placeholder="$t('uauth.login.placeholder.password', 'Please enter password')" :block="true"></form-input>
    </form-group>
    <form-group>
      <form-input name="rememberme" id="rememberme" ref="rememberme" v-model="rememberme" type="checkbox">{{$t('paths.rememberme', 'Remember Me')}}</form-input>
    </form-group>
    <form-group>
      <form-button name="submit" type="primary" size="large" :block="true" :disabled="$route.query.application && !applicationRead.id" :submitting="submitting">{{$t('uauth.login.submit', 'Submit')}}</form-button>
    </form-group>
    <form-group>
      <form-button type="light" :name="$route.query.application ? 'a' : 'router-link'" size="large" :block="true" v-show="!$route.query.application || applicationRead.id" :to="redirect_uri === '/' && applicationRead.homeUrl ? applicationRead.homeUrl : redirect_uri">{{$t('uauth.login.cancel', 'Cancel')}}</form-button>
    </form-group>
  </form-index>
  <menu id="menu">
    <ul>
      <li><router-link :to="'/uauth/create' + search">{{$t('uauth.menus.create', 'Create account')}}</router-link></li>
      <li><router-link :to="'/uauth/password' + search">{{$t('uauth.menus.password', 'Forgot password ?')}}</router-link></li>
    </ul>
  </menu>
  <oauth-menu :disabled="submitting || ($route.query.application && !applicationRead.id)" method="login" :rememberme="rememberme" :redirect_uri="redirect_uri"></oauth-menu>
</div>
</template>

<script>
/* @flow */
import { mapState } from 'vuex'
import queryString from 'query-string'
import { TOKEN, MESSAGE } from '../../store/types'
import OAuthMenu from './OAuthMenu'
import FormIndex from '../../components/forms/Index'
import FormButton from '../../components/forms/Button'
import FormGroup from '../../components/forms/Group'
import FormInput from '../../components/forms/Input'

export default {
  components: {
    FormIndex,
    FormButton,
    FormGroup,
    FormInput,
    OauthMenu: OAuthMenu,
  },

  data() {
    let search = queryString.stringify(Object.assign({}, this.$route.query, { message: undefined }))
    if (search) {
      search = '?' + search
    }
    return {
      username: '',
      password: '',
      rememberme: false,
      search,
      submitting: false,
    }
  },

  watch: {
    $route() {
      this.messageAuto()
    },
  },

  computed: {
    redirect_uri() {
      return this.$route.query.redirect_uri || '/'
    },
    ...mapState(['site', 'token', 'applicationRead'])
  },

  methods: {
    messageAuto() {
      if (__SERVER__) {
        return
      }
      let messages = {
        notlogged: {
          message: 'notlogged',
        },
        oauth_timeout: {
          message: 'timeout',
          path: 'auth',
        },
        oauth_cancel: {
          message: 'cancel',
          path: 'auth',
        },
        oauth_retry: {
          message: 'retry',
          path: 'auth',
        },
        oauth_token: {
          message: 'retry',
          path: 'auth',
        },
      }
      let name = this.$route.query.message || ''
      if (messages[name]) {
        this.$store.commit({
          type: MESSAGE,
          state: { ...messages[name], translate: true },
        })
      }
    },


    async onSubmit() {
      const store = this.$store

      let data = { ...this.$data }
      try {
        this.submitting = true
        let token = await store.fetch('POST', '/uauth/login', {}, data)
        store.commit({
          type: TOKEN,
          state: token,
        })
        this.$router.push(this.redirect_uri)
      } catch (e) {
        this.$refs.form.reportValidity(e)
        store.commit({ type: MESSAGE, state: e })
      } finally {
        this.submitting = false
      }
    },
  },

  mounted() {
    this.messageAuto()
  },

  headers() {
    let title = this.$t('uauth.login.title', 'Log in')
    let meta = []
    if (this.$route.query.application) {
      meta.push({ name: 'robots', content: 'none' })
    }
    return {
      title: [title, this.site.title],
      meta,
    }
  }
}
</script>
