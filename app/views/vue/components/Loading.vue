<template>
<div class="load">
  <div :class="['loading', size, middle ? 'middle' : '',  progress === -1 ? 'animation' : '']">
    <span class="circle">
    </span>
  </div>
  <span class="text">111</span>
</div>
</template>
<style lang="sass">
@import "../styles/variables"
.load
  position: relative
  text-align: center
  .loading
    position: relative
    font-size: 1.2rem
    &.absolute
      position: relative
      top: 50%
      left: 50%
      transform: translate(-50%, -50%)
    &.sm
      .circle
        width: 1.6rem
        height: 1.6rem
        border-width: 2px
    &.lg
      .circle
        width: 3rem
        height: 3rem
        border-width: 4px
    &.xl
      .circle
        width: 4rem
        height: 4rem
        border-width: 5px
    &.animation
      .circle
        animation: loading .6s linear
        animation-iteration-count: infinite
    .circle
      width: 2rem
      height: 2rem
      border: 3px solid map-get($loading, bg)
      border-right-color: map-get($loading, color)
      border-radius: 50%
      display: inline-block
      z-index: 2
  .text
    text-align: center
    font-size: .85rem
@keyframes loading
  to
    transform: rotate(1turn)
</style>
<script>
/* @flow */
export default {
  props: {
    size: {
      type: String,
      default: 'md',
    },
    progress: {
      type: Number,
      default: -1,
    },
    middle: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
