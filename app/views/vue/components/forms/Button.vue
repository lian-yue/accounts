<template>
<router-link :class="className" v-on="$listeners" v-if="['router-link', 'link', 'router'].indexOf(name) != -1 && !disabled" :to="to || href">
  <slot></slot>
</router-link>
<a :class="className" v-on="$listeners" v-else-if="['router-link', 'link', 'router', 'a'].indexOf(name) != -1" :href="to || href" @click="onClick">
  <slot></slot>
</a>
<button :type="name" :class="className" v-on="$listeners" :disabled="disabled" v-else>
  <slot></slot>
</button>
</template>
<style lang="sass">
@import "../../styles/variables"

@mixin button-type-mixin($value)
  @if map-has-key($value, color)
    color: map-get($value, color)
    &:hover,
    &.hover,
    &:active,
    &.active,
    &.outline:hover,
    &.outline:active
      color: map-get($value, color)
  @if map-has-key($value, bg)
    background: map-get($value, bg)
    border-color: map-get($value, bg)
    &:hover,
    &.hover,
    &:active,
    &.active
      background: darken(map-get($value, bg), 8)
      border-color: darken(map-get($value, bg), 12)
    &:focus,
    &.focus
      box-shadow: 0 0 0 3px rgba(map-get($value, bg),.4)
    &:disabled,
    &.disabled
      background: map-get($value, bg)
    &:active
    &.outline
      color: map-get($value, bg)
      &:hover,
      &:active
        border-color: darken(map-get($value, bg), 5)
        background: map-get($value, bg)
.form-button
  background: transparent
  cursor: pointer
  display: inline-block
  line-height: 1.25
  font-weight: 400
  text-align: center
  vertical-align: middle
  user-select: none
  white-space: nowrap
  border: 1px solid transparent
  padding: .5rem .75rem
  font-size: 1rem
  border-radius: .25rem
  transition: all .15s ease-in-out
  &:disabled,
  &.disabled
    opacity: .65
    cursor: default
  &:hover,
  &.hover,
  &:active,
  &.active
    text-decoration: none
  &:focus,
  &.focus
    outline: 0
  &.block
    width: 100%
    display: block
  &.outline
    background: transparent
  @include button-type-mixin($button-default)
@each $name, $value in $buttons
  .button-#{$name}
    @include button-type-mixin($value)



.button-large
  padding: .5rem 1rem
  font-size: 1.25rem
  line-height: 1.5
  border-radius: .3rem
.button-small
  padding: .375rem .5rem
  font-size: .875rem
  border-radius: .2rem
.button-smallr
  line-height: 1.2
  padding: .25rem .4rem
  font-size: .75rem
  border-radius: .15rem



</style>
<script>
/* @flow */
export default {
  props: {
    type: {
      type: String,
      default: 'secondary',
    },
    href: {
      type: String,
    },

    to: {
    },

    name: {
      type: String,
      default: 'button',
    },
    block: {
      type: Boolean,
    },
    size: {
      type: String,
      default: 'medium',
    },
    disabled: {
      type: Boolean,
    },
    submitting: {
      type: Boolean,
    },
    outline: {
      type: Boolean,
    }
  },
  methods: {
    onClick(e) {
      if (this.disabled) {
        e.preventDefault()
      }
    }
  },
  computed: {
    className() {
      return [
        'form-button',
        'button-' + this.type,
        'button-' + this.size,
        this.block ? 'block' : undefined,
        this.outline ? 'outline' : undefined,
        this.submitting ? 'submitting' : undefined,
        this.disabled || this.submitting ? 'disabled' : undefined,
      ]
    }
  }
}
</script>
