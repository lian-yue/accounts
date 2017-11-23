<template>
<div id="app">
  <router-view></router-view>
  <message-popup></message-popup>
</div>
</template>
<style lang="sass">
@import "~normalize.css"
@import "../styles/variables"
*, ::after, ::before
  box-sizing: inherit
html
  box-sizing: border-box
  background: $body-bg
body
  color: $color
  font-family: Microsoft YaHei,-apple-system,system-ui,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif
  line-height: 1.5
  font-size: 1rem
a:not([href]):not([tabindex])
  color: inherit
  text-decoration: none

a
  color: map-get($link, color)
  text-decoration: none
  background-color: transparent
  -webkit-text-decoration-skip: objects
  &:hover
    color: map-get($link, hover-color)
    text-decoration: underline

label
  user-select: none
  display: inline-block
  margin-right: .4rem
  margin-bottom: .3rem

[role=button],
a,
area,
button,
input,
label,
select,
summary,
textarea
  touch-action: manipulation

input[type=checkbox],
input[type=radio]
  box-sizing: border-box
  padding: 0

.close
  padding: 0
  border: 0
  -webkit-appearance: none
  background: transparent
  cursor: pointer
  float: right
  font-size: 1.5rem
  font-weight: 700
  line-height: 1
  color: #000
  text-shadow: 0 1px 0 rgba($black, .4)
  opacity: .5
.hide
  display: none

#message-popup
  max-width: 300px
  z-index: 1040
  position: fixed
  top: 40%
  left: 50%
  .message
    transform: translate(-50%, -50%)
    text-align: center
    background: rgba($black, .8)
    color: #fff
    border: 0
    border-radius: .2rem
    padding: 1px 1rem
    p
      margin: 1rem 0

    .close
      display: none
</style>
<script>
/* @flow */
import { mapState } from 'vuex'
import { MESSAGE_CLEAR } from '../store/types'

const MessagePopup = {
  methods: {
    onClose(e) {
      if (this.timrer) {
        clearTimeout(this.timrer)
        this.timrer = null
      }
      e && e.preventDefault()
      if (this.message.popup && !this.message.popup.close) {
        this.$store.commit({ type: MESSAGE_CLEAR, name: 'popup' })
      }
    }
  },
  computed: mapState(['message', 'route']),
  watch: {
    message() {
      if (__SERVER__) {
        return
      }
      let popup = this.message.popup
      if (popup && !popup.close) {
        if (this.timrer) {
          clearTimeout(this.timrer)
          this.timrer = null
        }
        if (popup.canClose || popup.canClose === undefined) {
          this.timrer = setTimeout(() => {
            this.onClose()
          }, 3000)
        }
      }
    },
    $route() {
      if (!__SERVER__) {
        this.onClose()
      }
    },
  },
  render(h) {
    return h(
      'div',
      {
        attrs: {
          id: 'message-popup'
        },
        on: {
          dblclick: this.onClose
        },
      },
      [
        h(
          'message',
          {
            props: {
              name: 'popup',
            },
          }
        )
      ]
    )
  }
}


export default {
  components: {
    MessagePopup
  },
}
</script>
