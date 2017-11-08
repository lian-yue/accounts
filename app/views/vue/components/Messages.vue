<template>
<div role="alert" :class="['messages', 'messages-' + type, messages.length && !close ? 'show' : 'hide']">
    <button type="button" class="close" v-if="canClose" @click="onClose"><span>×</span></button>
    <p v-for="(message, key) in messages" :key="key">{{typeof message == 'string' ? message : message.message}}</p>
</div>
</template>
<style lang="sass">
@import "../styles/variables"
@mixin messages-type-mixin($value)
  @if map-has-key($value, border)
    border-color: map-get($value, border)
  @if map-has-key($value, color)
    color: map-get($value, color)
  @if map-has-key($value, bg)
    background: map-get($value, bg)
  @if map-has-key($value, shadow)
    box-shadow: map-get($value, shadow)
.messages
  border-left: .25rem solid transparent
  padding: .8rem 1rem
  @include messages-type-mixin($messages-default)
@each $name, $value in $messages
  .messages-#{$name}
    @include messages-type-mixin($value)
  p
    margin: 0 0 1rem 0
    &:last-child
      margin-bottom: 0
</style>
<script>
/* @flow */
import { MESSAGES_CLOSE } from '../store/types'
export default {
  props: {
    name: {
      type: String,
      default: '',
    },
  },
  computed: {
    data() {
      return this.$store.state.messages[this.name] || {}
    },
    messages() {
      return this.data.messages || []
    },
    canClose() {
      return this.data.canClose === undefined ? true : this.data.canClose
    },
    type() {
      return this.data.type || 'danger'
    },
    close() {
      return this.data.close
    },
  },
  methods: {
    onClose(e) {
      e && e.preventDefault()
      this.$store.commit({ type: MESSAGES_CLOSE, name: this.name })
    }
  },
  beforeDestroy() {
    this.onClose()
  }
}
</script>
