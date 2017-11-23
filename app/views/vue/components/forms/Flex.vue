<template>
<div class="form-flex" v-on="$listeners">
  <slot></slot>
</div>
</template>
<style lang="sass">
.form-flex
  position: relative
  display: flex
  align-items: stretch
  width: 100%
  .form-input,
  .form-button
    flex: auto
</style>
