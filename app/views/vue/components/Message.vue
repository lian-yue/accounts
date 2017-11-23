<template>
<div role="alert" :class="['message', 'message-' + type, messages.length ? 'show' : 'hide']">
    <button type="button" class="close" v-if="close" @click.prevent="onClose"><span>×</span></button>
    <p v-for="(message, key) in messages" :key="key">{{translate(message)}}</p>
</div>
</template>
<style lang="sass">
@import "../styles/variables"
@mixin message-type-mixin($value)
  @if map-has-key($value, border)
    border-color: map-get($value, border)
  @if map-has-key($value, color)
    color: map-get($value, color)
  @if map-has-key($value, bg)
    background: map-get($value, bg)
  @if map-has-key($value, shadow)
    box-shadow: map-get($value, shadow)
.message
  border: 1px solid transparent
  border-radius: .25rem
  padding: .8rem 1rem
  margin-bottom: 1rem
  @include message-type-mixin($message-default)
@each $name, $value in $message
  .message-#{$name}
    @include message-type-mixin($value)
  p
    margin: 0 0 1rem 0
    &:last-child
      margin-bottom: 0
</style>
<script>
/* @flow */
import { MESSAGE_CLEAR } from '../store/types'
import { mapState } from 'vuex'
export default {
  props: {
    name: {
      type: String,
      default: '',
    },
  },
  computed: {
    ...mapState(['message']),
    data() {
      return this.message[this.name] || {}
    },
    close() {
      return this.data.close === undefined ? true : this.data.close
    },
    messages() {
      return this.data.messages || []
    },
    type() {
      return this.data.type || 'danger'
    },
  },
  methods: {
    translate(message) {
      let value
      let defaultMessage = message.defaultMessage || message.message || 'Message'
      if (message.properties) {
        value = this.$t(message.properties.message.indexOf('.') === -1 ? 'errors.' + message.properties.message : message.properties.message, defaultMessage, message.properties)
      } else if (message.translate) {
        value = this.$t(message.message.indexOf('.') === -1 ? 'errors.' + message.message : message.message, defaultMessage, message)
      } else {
        value = message.message || defaultMessage
      }
      return value
    },
    onClose() {
      this.$store.commit({ type: MESSAGE_CLEAR, name: this.name })
    }
  },
  beforeDestroy() {
    this.onClose()
  }
}
</script>
