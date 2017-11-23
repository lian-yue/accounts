<template>
<main>
  <section id="content">
    <div id="not-found">
    </div>
  </section>
</main>
</template>
<script>
import site from 'config/site'

import { MESSAGE } from '../../store/types'

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
        type: MESSAGE,
        name: 'popup',
        state: {
          message: 'notexist',
          path: 'page',
          translate: true,
        }
      })
    }
  },

  mounted() {
    this.messageAuto()
  },

  headers() {
    let title = this.$t('error.title', 'Error')
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
