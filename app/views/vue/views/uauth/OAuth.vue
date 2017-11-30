<template>
<div id="uauth-oauth">
  <form-index role="form" method="post" ref="form" @submit.prevent="onCreate">
    <message/>
    <div v-if="!oauthToken.id && isCallback">
      <form-group>
        <form-button name="button" @click.prevent="oauthLogin" type="primary" size="large" :submitting="loading" :block="true">{{$t('uauth.oauth.login', 'Login')}}</form-button>
      </form-group>
      <form-group>
        <form-button type="light" @click.prevent="onCancel" size="large" :block="true">{{$t('uauth.oauth.cancel', 'Cancel')}}</form-button>
      </form-group>
    </div>
    <div v-else-if="create">
      <form-group>
        <label for="username">{{$t('paths.username', 'Username')}}:</label>
        <form-input name="username" id="username" :validate="validateUsername" ref="username" v-model="username" type="text" required minlength="3" maxlength="16" :placeholder="$t('uauth.create.placeholder.username', 'Only use A-Za-z0-9 and -')" :block="true"></form-input>
      </form-group>
      <form-group>
        <form-button name="submit" type="primary" size="large" :block="true" :submitting="submitting">{{$t('uauth.oauth.submit', 'Submit')}}</form-button>
      </form-group>
      <form-group>
        <form-button type="light" @click.prevent="onCancel" size="large" :block="true">{{$t('uauth.oauth.cancel', 'Cancel')}}</form-button>
      </form-group>
    </div>
    <loading v-else-if="loading" size="xl" />
    <div v-else>
      <!--default-->
    </div>
  </form-index>
</div>
</template>
<style lang="sass">
#uauth-oauth
  .loading
    padding: 1rem


</style>
<script>
/* @flow */
import querystring from 'query-string'
import parseurl from 'parseurl'
import { mapState } from 'vuex'
import { MESSAGE, TOKEN } from '../../store/types'
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
      if (this.$route.query.redirectUri) {
        return this.$route.query.redirectUri
      }
      if (this.$route.query.redirect_uri) {
        return this.$route.query.redirect_uri
      }
      if (this.redirectUri) {
        let url = parseurl({ url: this.redirectUri })
        let query = url.query
        if (query) {
          query = querystring.parse(url.query)
          if (query.redirectUri) {
            return query.redirectUri
          }
          if (query.redirect_uri) {
            return query.redirect_uri
          }
        }
      }
      return '/'
    },

    loginUrl() {
      let url = parseurl({ url: this.redirect_uri })
      let query = url.query ? querystring.parse(url.query) : {}
      delete query.cancel
      query.column = this.$route.params.column
      query.oauth_token_id = this.oauthToken.id
      query.login = true
      return { query, path: url.path, hash: url.hash }
    },
    cancelUrl() {
      let url = parseurl({ url: this.redirect_uri })
      let query = url.query ? querystring.parse(url.query) : {}
      delete query.oauth_token_id
      delete query.login
      query.column = this.$route.params.column
      query.cancel = true
      return { query, path: url.path, hash: url.hash }
    },
    basePath() {
      return this.$route.path.replace(/\/$/, '')
    },
    isCallback() {
      return this.$route.query.code || this.$route.query.oauth_token || this.$route.query.state || this.$route.query.oauth_verifier || this.$route.query.error
    },
    ...mapState(['site', 'token'])
  },
  methods: {
    async oauthLogin() {
      const store = this.$store
      try {
        this.loading = true
        let redirect_uri = this.$route.path
        let query = querystring.stringify(Object.assign(this.$route.query, { error: undefined, code: undefined, state: undefined, oauth_token: undefined, oauth_verifier: undefined }))
        if (query) {
          redirect_uri += '?' + query
        }
        let result = await store.fetch('POST', this.basePath + '/login', {}, { redirect_uri })
        window.location.href = result.redirectUri
      } catch (e) {
        store.commit({ type: MESSAGE, state: e })
      } finally {
        this.loading = false
      }
    },

    async fetchOAuthToken() {
      let query = { ...this.$route.query }
      const store = this.$store
      try {
        this.loading = true
        let oauthToken = {}
        if (!this.token._id) {
          await store.dispatch({
            type: TOKEN,
            save: true,
          })
        }
        if (this.isCallback) {
          oauthToken = await store.fetch('POST', this.basePath + '/callback', {}, query)
          this.$router.replace(oauthToken.redirectUri)
        } else {
          oauthToken = await store.fetch('GET', this.basePath + '/token')
        }
        this.oauthToken = oauthToken
      } catch (e) {
        if (e.redirectUri) {
          this.redirectUri = e.redirectUri
        }
        if (e.messages && e.messages[0].type === 'cancel') {
          this.onCancel()
        }
        store.commit({ type: MESSAGE, state: e })
      } finally {
        this.loading = false
      }
    },
    async onLogin() {
      const store = this.$store
      try {
        this.loading = true
        let token = await store.fetch('POST', '/uauth/login', {}, {
          column: this.$route.params.column,
          remember: this.$route.query.remember || this.$route.query.rememberme || '',
        })
        await store.commit({
          type: TOKEN,
          state: token,
        })
        this.$router.push(this.loginUrl)
      } catch (e) {
        if (e.status === 404) {
          store.commit({ type: MESSAGE, state: this.$t('uauth.oauth.login', 'Please fill in the information below'), messageType: 'info' })
          let username = this.oauthToken.username || this.oauthToken.nickname || ''
          username = username.replace(/[^0-9a-zA-Z-]+/g, '-').replace(/(\-+)/g, '-').replace(/^\-|\-$/g, '')
          if (username.length < 3) {
            username = this.$route.params.column + '-' + this.$locale.formatDate(new Date, '{YYYY}{MM}{DD}') + Math.random().toString(36).substr(2, 6)
          }
          this.username = username
          this.create = true
        } else {
          store.commit({ type: MESSAGE, state: e })
        }
      } finally {
        this.loading = false
      }
    },

    async onCreate() {
      const store = this.$store

      let data = {
        ...this.oauthToken,
        remember: this.$route.query.remember || this.$route.query.rememberme || '',
        username: this.username,
        column: this.$route.params.column,
        id: undefined,
      }
      try {
        this.submitting = true
        let token = await store.fetch('POST', '/uauth/create', {}, data)
        store.commit({
          type: TOKEN,
          state: token,
        })
        this.$router.push(this.loginUrl)
      } catch (e) {
        this.$refs.form.reportValidity(e)
        store.commit({ type: MESSAGE, state: e })
      } finally {
        this.submitting = false
      }
    },

    onCancel() {
      this.$router.push(this.cancelUrl)
    },

    async validateUsername(username) {
      try {
        let exists = await this.$store.fetch('GET', '/uauth/exists', { username })
        if (exists.username) {
          this.$refs.username.setValidity(this.$t('errors.hasexist', 'The {path} already exists', { path: 'username' }))
        }
      } catch (e) {
      }
    },
  },
  data() {
    return {
      submitting: false,
      username: '',
      create: false,
      loading: false,
      redirectUri: '',
      oauthToken: {},
    }
  },

  async mounted() {
    await this.fetchOAuthToken()
    if (!this.oauthToken.id && !this.isCallback) {
      await this.oauthLogin()
    }
    if (this.oauthToken.id) {
      await this.onLogin()
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
