<template>
<option v-if="$parent && $parent.type == 'select'" :value="value">
  <slot></slot>
</option>
<li v-else @click.prevent="onClick(value)" class="option">
  <slot></slot>
</li>
</template>
<style lang="sass">
// .option


</style>
<script>
/* @flow */
export default {
  props: {
    value: {
      required: true,
    },
    disabled: {
      type: Boolean,
    },
  },
  computed: {
    isShow() {
      // this.$parent.search
    }
  },
  methods: {
    onClick(value) {
      if ('selfValue' in this.$parent) {
        this.$parent.selfValue = value
      } else {
        this.$parent.value = value
      }
    },
  },
}
</script>
