<template>
<div id="auth-login">
  <h1 id="logo" :class="{'application-logo': $route.query.application}">
    <a :title="applicationRead.name" :href="applicationRead.homeUrl || '/'" v-if="$route.query.application">
      <img :src="applicationRead.logoUrl" v-if="applicationRead.logoUrl" />
    </a>
    <router-link :title="site.title + ' - ' + site.description" rel="home" to="/" v-else>{{site.title}}</router-link>
  </h1>
  <messages/>
  <form role="form" method="post" @submit="onSubmit">
    <div class="form-group">
      <label for="username" class="form-label">账号:</label>
      <input name="username" class="form-control" type="text" required v-model="username" maxLength="32" placeholder="请输入用户名/E-mail" id="username" ref="username" />
    </div>
    <div class="form-group">
      <label for="password" class="form-label">密码:</label>
      <input name="password" class="form-control" type="password" required v-model="password" maxLength="32" placeholder="请输入密码" id="password" ref="password" />
    </div>
    <div class="form-group">
      <button type="submit" class="btn btn-primary btn-block btn-lg" :disabled="disabled">登陆</button>
    </div>
    <div class="form-group">
      <a class="btn btn-primary btn-block btn-lg" :href="redirect_uri === '/' ? applicationRead.homeUrl : redirect_uri" v-if="$route.query.application" v-show="applicationRead.id">取消</a>
      <router-link class="btn btn-primary btn-block btn-lg" :to="redirect_uri" v-else>取消</router-link>
    </div>
    <menu id="menu">
      <ul>
        <li><router-link :to="'/auth/login' + search">登录</router-link></li>
        <li><router-link :to="'/auth/password' + search">忘记密码？</router-link></li>
      </ul>
    </menu>
    <oauth-menu :disabled="disabled" name="注册" :redirect_uri="redirect_uri"></oauth-menu>
  </form>
</div>
</template>
<script>
import { mapState } from 'vuex'
import queryString from 'query-string'
import site from 'config/site'
import { MESSAGES } from '../../store/types'
import OAuthMenu from './OAuthMenu'

export default {
  components: {
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
    var title = '注册账号'
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
