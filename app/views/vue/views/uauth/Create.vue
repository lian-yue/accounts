<template>
<div id="uauth-create">
  <form-index role="form" method="post" ref="form" @submit.prevent="onSubmit">
    <message/>
    <form-group>
      <label for="username">{{$t('paths.username', 'Username')}}:</label>
      <form-input name="username" id="username" :validate="validateUsername" ref="username" v-model="username" type="text" required minlength="3" maxlength="16" :placeholder="$t('uauth.create.placeholder.username', 'Only use A-Za-z0-9 and -')" :block="true"></form-input>
    </form-group>

    <form-group v-if="!$route.query.to_type || $route.query.to_type === 'phone'">
      <label for="phone">{{$t('paths.phone', 'Phone')}}:</label>
      <router-link class="form-to-type" :to="{path: $route.path, query: Object.assign({}, $route.query, {to_type: 'email'})}">{{$t('uauth.create.use_email', 'Use email')}}</router-link>
      <form-input name="phone" id="phone" :validate="true" ref="phone" v-model="phone" type="text" required minlength="8" maxlength="16" :placeholder="$t('uauth.create.placeholder.phone', 'Mobile phone number')" :block="true"></form-input>
      <label for="phone-code">{{$t('paths.phoneCode', 'Validation code')}}:</label>
      <form-flex>
        <form-input name="phone-code" id="phone-code" class="form-code" :validate="true" ref="emailCode" v-model="phoneCode" type="text" required maxlength="6" :placeholder="$t('uauth.create.placeholder.code', 'Code')" ></form-input>
        <form-button name="send" class="form-send" type="light" :disabled="codeTimems > 0" :submitting="sendSubmitting" @click.prevent="onSend">{{codeTimems > 0 ? codeTimems : $t('uauth.create.send', 'Send')}}</form-button>
      </form-flex>
    </form-group>
    <form-group v-else-if="$route.query.to_type === 'email'">
      <label for="email">{{$t('paths.email', 'E-mail')}}:</label>
      <router-link class="form-to-type" :to="{path: $route.path, query: Object.assign({}, $route.query, {to_type: 'phone'})}">{{$t('uauth.create.use_phone', 'Use phone')}}</router-link>
      <form-input name="email" id="email" :validate="true" ref="email" v-model="email" type="email" required minlength="3" maxlength="64" :placeholder="$t('uauth.create.placeholder.email', 'Please enter your e-mail')" :block="true"></form-input>

      <label for="email-code">{{$t('paths.emailCode', 'Validation code')}}:</label>
      <form-flex>
        <form-input name="email-code" id="email-code" class="form-code" :validate="true" ref="emailCode" v-model="emailCode" type="text" required maxlength="6" :placeholder="$t('uauth.create.placeholder.code', 'Code')" ></form-input>
        <form-button name="send" class="form-send" type="light" :disabled="codeTimems > 0" :submitting="sendSubmitting" @click.prevent="onSend">{{codeTimems > 0 ? codeTimems : $t('uauth.create.send', 'Send')}}</form-button>
      </form-flex>
    </form-group>
    <form-group v-if="!$route.query.empty_password">
      <label for="password">{{$t('paths.password', 'Password')}}:</label>
      <router-link class="form-empty-password" :to="{path: $route.path, query: Object.assign({}, $route.query, {empty_password: 'true'})}">{{$t('uauth.create.empty_password', 'Do not password')}}</router-link>
      <form-input name="password" id="password" :validate="true" ref="password" v-model="password" type="password" required minlength="6" maxlength="64" :placeholder="$t('uauth.create.placeholder.password', 'Please enter password')" :block="true"></form-input>
    </form-group>
    <form-group v-if="!$route.query.empty_password">
      <label for="passwordAgain">{{$t('paths.passwordAgain', 'Password again')}}:</label>
      <form-input name="passwordAgain" id="passwordAgain" :validate="true" ref="passwordAgain" v-model="passwordAgain" type="password" required minlength="6" maxlength="64" :placeholder="$t('uauth.create.placeholder.passwordAgain', 'Please enter your password again')" :block="true"></form-input>
    </form-group>
    <form-group v-show="$route.query.empty_password">
      <router-link class="form-set-password" :to="{path: $route.path, query: Object.assign({}, $route.query, { empty_password: undefined })}">{{$t('uauth.create.set_password', 'Set password')}}</router-link>
    </form-group>
    <form-group>
      <form-button name="submit" type="primary" size="large" :block="true" :disabled="$route.query.application && !applicationRead.id" :submitting="submitting">{{$t('uauth.create.submit', 'Submit')}}</form-button>
    </form-group>
  </form-index>
  <menu id="menu">
    <ul>
      <li><router-link :to="'/uauth/login' + search">{{$t('uauth.menus.signin', 'Sign in')}}</router-link></li>
      <li><router-link :to="'/uauth/password' + search">{{$t('uauth.menus.password', 'Forgot password ?')}}</router-link></li>
    </ul>
  </menu>
  <oauth-menu v-if="!$route.query.application || applicationRead.id" method="create" :redirect_uri="redirect_uri"></oauth-menu>
</div>
</template>
<style lang="sass">
#uauth-create
  label[for="email-code"],
  label[for="phone-code"],
    margin-top: 1rem
    display: block
  .form-code
    width: 100%
    margin-right: 1rem
  .form-send
    min-width: 120px
  .form-empty-password,
  .form-to-type
    float: right
</style>
<script>
/* @flow */
import { mapState } from 'vuex'
import queryString from 'query-string'
import { TOKEN, MESSAGE } from '../../store/types'

import OAuthMenu from './OAuthMenu'
import FormIndex from '../../components/forms/Index'
import FormFlex from '../../components/forms/Flex'
import FormGroup from '../../components/forms/Group'
import FormButton from '../../components/forms/Button'
import FormInput from '../../components/forms/Input'

export default {
  components: {
    FormIndex,
    FormGroup,
    FormFlex,
    FormButton,
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
      passwordAgain: '',
      phone: '',
      email: '',
      emailCode: '',
      phoneCode: '',
      codeTimems: 0,

      search,
      sendSubmitting: false,
      submitting: false,
    }
  },


  computed: {
    redirect_uri() {
      return this.$route.query.redirect_uri || '/'
    },
    ...mapState(['site', 'token', 'applicationRead'])
  },
  watch: {
    codeTimems(value) {
      if (value > 0) {
        setTimeout(() => {
          this.codeTimems--
        }, 1000)
      }
    }
  },

  methods: {
    async validateUsername(username) {
      try {
        let exists = await this.$store.fetch('GET', '/uauth/exists', { username })
        if (exists.username) {
          this.$refs.username.setValidity(this.$t('errors.hasexist', 'The {path} already exists', { path: 'username' }))
        }
      } catch (e) {
      }
    },

    async onSubmit() {
      const store = this.$store

      let data = { ...this.$data }
      if (this.$route.query.empty_password) {
        delete data.password
        delete data.passwordAgain
      }
      try {
        this.submitting = true
        let token = await store.fetch('POST', '/uauth/create', {}, data)
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

    async onSend(e) {
      let to_type = this.$route.query.to_type || 'phone'
      let input = this.$refs[to_type]
      if (!input || !input.isValid) {
        return
      }
      const store = this.$store
      let to = to_type === 'email' ? this.email : this.phone
      try {
        this.sendSubmitting = true
        await store.fetch('POST', '/uauth/createVerification', {}, { to, to_type })
        this.codeTimems = 60
      } catch (e) {
        store.commit({ type: MESSAGE, state: e })
      } finally {
        this.sendSubmitting = false
      }
    }
  },

  headers() {
    let title = this.$t('uauth.create.title', 'Create Account')
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
