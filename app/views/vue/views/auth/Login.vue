<template>
<div id="auth-login">
  <h1 id="logo">
    <a :title="applicationRead.name" :href="applicationRead.homeUrl || '/'" v-if="$route.query.application" :style="{'background-image': 'url('+ applicationRead.logoUrl +')'}">{{applicationRead.name}}</a>
    <router-link :title="site.title + ' - ' + site.description" rel="home" to="/" v-else><img src="//www.lianyue.org/assets/react/images/logo.jpg?v=d24aff83" />{{site.title}}</router-link>
  </h1>
  <h2 id="title">用户登录</h2>
  <messages/>
  <form role="form" method="post" @submit="onSubmit">
    <form-group>
      <label for="username">账号:</label>
      <form-input name="username" id="username" :autoValidate="false" ref="username" v-model="username"  type="text" required maxlength="64" placeholder="请输入用户名/E-mail" />
    </form-group>
    <form-group>
      <form-group>
        <label for="username">密码:</label>
        <form-input name="password" id="password" :validate="true" ref="password" v-model="password" type="password" required maxlength="64" placeholder="请输入密码" label="密码:">
        </form-input>
      </form-group>
      <form-group>
        <form-input name="password" id="password" :validate="true" ref="password" v-model="password" type="password" required maxlength="64" placeholder="请输入密码" label="密码:" :block="true">
        </form-input>
      </form-group>
      <form-group>
        <form-input name="email" id="email" ref="email" v-model="email" type="number" :block="true" />
      </form-group>
      <form-group>
        <form-input name="email" id="email" ref="email" v-model="email" type="search" :block="true" />
      </form-group>
      <form-group>
        <form-input name="email" id="email2" ref="email" v-model="email" type="select" :custom="true" :block="true">
          <form-option value="1">1</form-option>
          <form-option value="3">2</form-option>
          <form-option value="3">3</form-option>
        </form-input>
      </form-group>
      <form-input name="email" id="email" ref="email" v-model="email" type="textarea" :block="true" />
    </form-group>
    <form-group>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="1" v-model="checkbox" type="checkbox" :disabled="true">记住我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="2" v-model="checkbox" type="checkbox" :disabled="true">忘记我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="3" v-model="checkbox" type="checkbox">忘记我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="4" v-model="checkbox" type="checkbox">知道我</form-input>
    </form-group>
    <form-group>
      <form-input name="radio1" id="radio" ref="radio" check="1" v-model="radio" type="radio" :disabled="true">记住我</form-input>
      <form-input name="radio1" id="radio" ref="radio" check="2" v-model="radio" type="radio" :disabled="true">忘记我</form-input>
      <form-input name="radio1" id="radio" ref="radio" check="3" v-model="radio" type="radio">选择我</form-input>
      <form-input name="radio1" id="radio" ref="radio" check="4" v-model="radio" type="radio">知道我</form-input>
    </form-group>
    <form-group>
      <form-input name="radio2" id="radio" ref="radio" check="1" v-model="radio" type="radio" :disabled="true">记住我</form-input>
      <form-input name="radio2" id="radio" ref="radio" check="2" v-model="radio" type="radio" :disabled="true">忘记我</form-input>
      <form-input name="radio2" id="radio" ref="radio" check="3" v-model="radio" type="radio">选择我</form-input>
      <form-input name="radio2" id="radio" ref="radio" check="4" v-model="radio" type="radio">知道我</form-input>
    </form-group>
    <form-group>
      <form-input name="radio" id="radio" ref="radio" check="1" v-model="radio" type="radio" :disabled="true">记住我</form-input>
      <form-input name="radio" id="radio" ref="radio" check="2" v-model="radio" type="radio" :disabled="true">忘记我</form-input>
      <form-input name="radio" id="radio" ref="radio" check="3" v-model="radio" type="radio">选择我</form-input>
      <form-input name="radio" id="radio" ref="radio" check="4" v-model="radio" type="radio">知道我</form-input>
    </form-group>
    <form-group>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="1" :custom="true" v-model="checkbox" type="checkbox" :disabled="true">记住我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="2" :custom="true" v-model="checkbox" type="checkbox" :disabled="true">忘记我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="3" :custom="true" v-model="checkbox" type="checkbox">忘记我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="4" :custom="true" v-model="checkbox" type="checkbox">知道我</form-input>
    </form-group>
    <form-group>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="1" :custom="true" v-model="checkbox" type="checkbox" :disabled="true">记住我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="2" :custom="true" v-model="checkbox" type="checkbox" :disabled="true">忘记我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="3" :custom="true" v-model="checkbox" type="checkbox">忘记我</form-input>
      <form-input name="checkbox" id="checkbox" ref="checkbox" check="4" :custom="true" v-model="checkbox" type="checkbox">知道我</form-input>
    </form-group>

    <form-group>
      <form-input name="radio3" id="radio" ref="radio" check="1" :custom="true" v-model="radio" type="radio" :disabled="true">记住我</form-input>
      <form-input name="radio3" id="radio" ref="radio" check="2" :custom="true" v-model="radio" type="radio" :disabled="true">忘记我</form-input>
      <form-input name="radio3" id="radio" ref="radio" check="3" :custom="true" v-model="radio" type="radio">选择我</form-input>
      <form-input name="radio3" id="radio" ref="radio" check="4" :custom="true" v-model="radio" type="radio">知道我</form-input>
    </form-group>
    <form-group>
      <form-input name="radio4" id="radio" ref="radio" check="1" :custom="true" v-model="radio" type="radio" :disabled="true">记住我</form-input>
      <form-input name="radio4" id="radio" ref="radio" check="2" :custom="true" v-model="radio" type="radio" :disabled="true">忘记我</form-input>
      <form-input name="radio4" id="radio" ref="radio" check="3" :custom="true" v-model="radio" type="radio">选择我</form-input>
      <form-input name="radio4" id="radio" ref="radio" check="4" :custom="true" v-model="radio" type="radio">知道我</form-input>
    </form-group>
    <form-group>
      <form-button name="submit" type="primary" size="large" :block="true">登录</form-button>
    </form-group>
      <form-group>
      <form-button type="light" :name="$route.query.application ? 'a' : 'router-link'" size="large" :block="true" v-show="!$route.query.application || applicationRead.id" :to="redirect_uri === '/' && applicationRead.homeUrl ? applicationRead.homeUrl : redirect_uri">取消</form-button>
    </form-group>
    <menu id="menu">
      <ul>
        <li><router-link :to="'/auth/create' + search">注册新的账号</router-link></li>
        <li><router-link :to="'/auth/password' + search">忘记密码？</router-link></li>
      </ul>
    </menu>
  </form>
  <oauth-menu :disabled="disabled" type="login" :redirect_uri="redirect_uri"></oauth-menu>
</div>
</template>
<style lang="sass">
#auth-login
  padding: 1rem
  background: #fff
</style>

<script>
import { mapState } from 'vuex'
import queryString from 'query-string'
import site from 'config/site'
import { MESSAGES } from '../../store/types'
import OAuthMenu from './OAuthMenu'
import FormButton from '../../components/forms/Button'
import FormGroup from '../../components/forms/Group'
import FormInput from '../../components/forms/Input'
import FormOption from '../../components/forms/Option'

export default {
  components: {
    FormButton,
    FormGroup,
    FormInput,
    FormOption,
    OauthMenu: OAuthMenu,
  },

  data() {
    var search = queryString.stringify(Object.assign({}, this.$route.query, {message: void 0}))
    if (search) {
      search = '?' + search
    }
    return {
      username: '',
      password: '',
      site,
      search,
      submitting: false,
      email: "",
      radio: '1',
      checkbox: ['1', '3'],
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

    disabled() {
      if (this.submitting) {
        return true
      }
      if (this.$route.query.application && !this.applicationRead.id) {
        return true
      }
      return false
    },
    ...mapState(['token', 'applicationRead'])
  },

  methods: {
    messageAuto() {
      if (__SERVER__) {
        return
      }
      switch (this.$route.query.message || '') {
        case 'not_logged':
          this.$store.commit({
            type: MESSAGES,
            name: 'popup',
            message: '您尚未登录请登录后重试'
          })
          break;
        case 'oauth_timeout':
          this.$store.commit({
            type: MESSAGES,
            name: 'popup',
            message: '认证超时请重试'
          })
          break;
        case 'oauth_token':
          this.$store.commit({
            type: MESSAGES,
            name: 'popup',
            message: '认证异常请重试'
          })
          break;
      }
    },


    async onSubmit(e) {
      e.preventDefault()
      const commit = this.$store.commit

      var body = {...this.$data}
      delete body.site
      try {
        this.submitting = true
        var token = await commit.fetch('/auth/login', {}, body)
        commit({
          type: TOKEN,
          token,
        })
        this.$router.push(this.redirect_uri)
      } catch (e) {
        commit(e)
      } finally {
        this.submitting = false
      }
    },
  },

  mounted() {
    this.messageAuto()
  },

  headers({state}) {
    var title = '登录'
    var meta = []
    if (state.route.query.application) {
      meta.push({name: 'robots', content:'none'},)
    }
    return {
      title: [title, site.title],
      meta,
      breadcrumb: [title],
    }
  }
}
</script>
