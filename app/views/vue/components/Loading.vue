<template>
<div :class="['loading', size, middle ? 'middle' : '']">
  <span class="circle">
  </span>
</div>
</template>
<script>
/* @flow */
export default {
  props: {
    size: {
      type: String,
      default: 'md',
    },
    middle: {
      type: Boolean,
      default: false,
    },
  },
}
</script>
