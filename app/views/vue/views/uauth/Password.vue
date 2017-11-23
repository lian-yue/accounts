<template>
<div id="uauth-password">
  <form-index v-if="!test" role="form" method="post" autocomplete="off" ref="form" @submit.prevent="onSubmit">
    <message/>
    <form-group>
      <label for="username">{{$t('paths.username', 'Username')}}:</label>
      <form-input name="username" id="username" :value="userRead.nickname + ' ('+ userRead.username +')'" type="text" :disabled="true" :block="true"></form-input>
    </form-group>
    <form-group>
      <label for="new-password">{{$t('paths.newPassword', 'New password')}}:</label>
      <form-input name="new-password" id="new-password" :validate="true" ref="newPassword" v-model="newPassword" type="password" required minlength="6" maxlength="64" :placeholder="$t('uauth.password.placeholder.newPassword', 'Please enter new password')" :block="true"></form-input>
    </form-group>
    <form-group>
      <label for="new-password-again">{{$t('paths.newPasswordAgain', 'New password again')}}:</label>
      <form-input name="new-password-again" id="new-password-again" :validate="true" ref="newPasswordAgain" v-model="newPasswordAgain" type="password" required minlength="6" maxlength="64" :placeholder="$t('uauth.password.placeholder.newPasswordAgain', 'Please enter your new password again')" :block="true"></form-input>
    </form-group>
    <form-group>
      <form-button name="submit" type="primary" size="large" :block="true">{{$t('uauth.password.next', 'Next step')}}</form-button>
    </form-group>
    <form-group>
      <form-button name="button" type="light" size="large" :block="true" @click.prevent="onPrev">{{$t('uauth.password.prev', 'Previous step')}}</form-button>
    </form-group>
  </form-index>


  <form-index v-else-if="userRead.id && userRead.auths" role="form" method="post" autocomplete="off" ref="form" @submit.prevent="onTest">
    <message/>
    <form-group>
      <label for="username">{{$t('paths.username', 'Username')}}:</label>
      <form-input name="username" id="username" :value="userRead.nickname + ' ('+ userRead.username +')'" type="text" :disabled="true" :block="true"></form-input>
    </form-group>
    <form-group>
      <label for="id">{{$t('paths.select', 'Select')}}:</label>
      <form-input name="id" id="id" :validate="true" ref="id" v-model="id" type="select" required :placeholder="$t('uauth.password.placeholder.select', 'Please select')" :block="true">
        <form-option v-for="auth in userRead.auths" :value="auth.id" :key="auth.id">
          {{auth.display}}
        </form-option>
      </form-input>
    </form-group>
    <form-group>
      <label for="code">{{$t('paths.code', 'Code')}}:</label>
      <form-flex>
        <form-input name="code" class="form-code" id="code" :validate="true" maxlength="6" ref="code" v-model="code" type="text" required :placeholder="$t('uauth.password.placeholder.code', 'Verification code')"></form-input>
        <form-button name="send" class="form-send" type="light" :disabled="codeTimems > 0" :submitting="sendSubmitting" @click.prevent="onSend">{{codeTimems > 0 ? codeTimems : $t('uauth.password.send', 'Send')}}</form-button>
      </form-flex>
    </form-group>
    <form-group>
      <form-button name="submit" type="primary" size="large" :block="true">{{$t('uauth.password.next', 'Next step')}}</form-button>
    </form-group>
    <form-group>
      <form-button name="button" type="light" size="large" :block="true" @click.prevent="onPrev">{{$t('uauth.password.prev', 'Previous step')}}</form-button>
    </form-group>
  </form-index>

  <form-index v-else role="form" method="post" ref="form" autocomplete="off" @submit.prevent="onSelect">
    <message/>
    <form-group>
      <label for="username">{{$t('paths.username', 'Username')}}:</label>
      <form-input name="username" id="username" :validate="true" ref="username" v-model="username" type="text" required maxlength="64" :placeholder="$t('uauth.password.placeholder.username', 'Please enter username / e-mail / phone')" :block="true"></form-input>
    </form-group>
    <form-group>
      <form-button name="submit" type="primary" size="large" :block="true" :disabled="$route.query.application && !applicationRead.id" :submitting="userRead.loading">{{$t('uauth.password.next', 'Next step')}}</form-button>
    </form-group>
  </form-index>
  <menu id="menu">
    <ul>
      <li><router-link :to="'/uauth/login' + search">{{$t('uauth.menus.signin', 'Sign in')}}</router-link></li>
      <li><router-link :to="'/uauth/create' + search">{{$t('uauth.menus.create', 'Create account')}}</router-link></li>
    </ul>
  </menu>
</div>
</template>
<style lang="sass">
#uauth-password
  .form-code
    width: 100%
    margin-right: 1rem
  .form-send
    min-width: 120px
</style>
<script>
/* @flow */

import { mapState } from 'vuex'
import queryString from 'query-string'
import { TOKEN, MESSAGE, MESSAGE_CLEAR, USER_READ, USER_READ_CLEAR } from '../../store/types'
import FormIndex from '../../components/forms/Index'
import FormFlex from '../../components/forms/Flex'
import FormButton from '../../components/forms/Button'
import FormGroup from '../../components/forms/Group'
import FormInput from '../../components/forms/Input'
import FormOption from '../../components/forms/Option'

export default {
  data() {
    let search = queryString.stringify(Object.assign({}, this.$route.query, { message: undefined }))
    if (search) {
      search = '?' + search
    }
    return {
      codeTimems: 0,
      code: '',
      id: '',
      username: '',
      newPassword: '',
      newPasswordAgain: '',
      test: true,
      search,
      sendSubmitting: false,
      submitting: false,
    }
  },

  components: {
    FormIndex,
    FormFlex,
    FormButton,
    FormGroup,
    FormInput,
    FormOption,
  },

  computed: {
    redirect_uri() {
      return this.$route.query.redirect_uri || '/'
    },
    ...mapState(['site', 'token', 'applicationRead', 'userRead'])
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
    async onPrev() {
      if (!this.test) {
        this.test = true
        return
      }
      const store = this.$store
      store.commit({
        type: USER_READ_CLEAR,
      })
    },
    async onTest(e) {
      const store = this.$store
      try {
        this.testSubmitting = true
        await store.fetch('POST', '/uauth/password', {}, { id: this.id, code: this.code, test: true })
        this.test = false
        store.commit({
          type: MESSAGE_CLEAR,
        })
      } catch (e) {
        this.$refs.form.reportValidity(e)
        store.commit({ type: MESSAGE, state: e })
      } finally {
        this.testSubmitting = false
      }
    },

    async onSend() {
      const store = this.$store
      if (!this.id) {
        return
      }
      try {
        this.sendSubmitting = true
        await store.fetch('POST', '/uauth/passwordVerification', {}, { id: this.id })
        this.codeTimems = 60
        store.commit({
          type: MESSAGE_CLEAR,
        })
      } catch (e) {
        store.commit({ type: MESSAGE, state: e })
      } finally {
        this.sendSubmitting = false
      }
    },
    async onSelect() {
      const store = this.$store
      let body = { ...this.$data }
      try {
        await store.dispatch({
          type: USER_READ,
          path: '/uauth/passwordSelect',
          body,
          throw: true,
          onState(data: Object) {
            if (!data.auths || !data.auths.length) {
              let e = new Error('notexist')
              e.path = 'auth'
              e.translate = true
              e.status = 400
              throw e
            }
            return data
          },
        })
        store.commit({ type: MESSAGE_CLEAR, name: '' })
      } catch (e) {
        this.$refs.form.reportValidity(e)
        store.commit({ type: MESSAGE, state: e })
      }
    },

    async onSubmit() {
      const store = this.$store
      let data = { ...this.$data, test: undefined }
      try {
        this.submitting = true
        let token = await store.fetch('POST', '/uauth/password', {}, data)
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
    }
  },


  created() {
    this.$store.commit({
      type: USER_READ_CLEAR,
    })
  },

  headers() {
    let title = this.$t('uauth.password.title', 'Forgot password')
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
