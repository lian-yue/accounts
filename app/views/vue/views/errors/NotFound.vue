<template>
<main>
  <section id="content">
    <div id="not-found">
      {{$t('views.error', 'Error')}}
    </div>
  </section>
</main>
</template>
<script>
import site from 'config/site'

import { MESSAGES } from '../../store/types'

export default {
  watch: {
    $route() {
      this.messageAuto()
    },
  },

  methods: {
    messageAuto() {
      if (__SERVER__) {
        return
      }
      this.$store.commit({
        type: MESSAGES,
        name: 'popup',
        message: 'notexist'
      })
    }
  },

  mounted() {
    this.messageAuto()
  },

  headers() {
    let title = this.$t('views.error', 'Error')
    return {
      status: 404,
      title: [
        title,
        site.title
      ],
      meta: [
        { name: 'robots', content: 'none' },
      ],
    }
  }
}
</script>
