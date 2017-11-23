<template>
<div :class="className">
  <label v-if="isCheck">
    <input v-bind="$props" :class="custom ? 'original' : 'inner'" :checked="checked" :value="check" @input="onValue" @change="onValue" @focus="onFocus" @blur="onBlur" ref="input" />
    <span class="inner" v-if="custom"></span>
    <slot></slot>
  </label>
  <span v-else-if="type === 'select' && custom">
    <input v-bind="$props" type="text" :value="selfValue" class="original" @input="onValue" @change="onValue" @focus="onFocus" @blur="onBlur" ref="input" />
    <form-data-list :value="selfValue" :search="search">
      <slot></slot>
    </form-data-list>
  </span>
  <select v-else-if="type === 'select'" v-bind="$props" :value="selfValue" class="inner" @input="onValue" @change="onValue" @focus="onFocus" @blur="onBlur" ref="input">
    <option disabled>{{placeholder || ''}}</option>
    <slot></slot>
  </select>
  <textarea v-else-if="type === 'textarea'" v-bind="$props" class="inner" :value="selfValue" @input="onValue" @change="onValue" @focus="onFocus" @blur="onBlur" @invalid="onInvalid" ref="input"></textarea>
  <input v-else v-bind="$props" class="inner" :value="selfValue" @input="onValue" @change="onValue" @focus="onFocus" @blur="onBlur"  @invalid="onInvalid" ref="input" />
</div>
</template>

<style lang="sass">
@import "../../styles/variables"

@mixin input-type-mixin($value, $focus: false)
  .inner
    @if map-has-key($value, color)
      color: map-get($value, color)
    @if map-has-key($value, bg)
      background: map-get($value, bg)
    @if map-has-key($value, placeholder)
      &::placeholder
        color: map-get($value, placeholder)
  @if map-has-key($value, border)
    .inner
      border-color: map-get($value, border)
    @if $focus
      &.focus
        .inner
          box-shadow: 0 0 0 3px rgba(map-get($value, border), .4)
    @if $focus == 1
        .inner
          box-shadow: 0 0 0 3px rgba(map-get($value, border), .4)


@mixin input-custom-type-mixin($value)
  @if map-has-key($value, text)
    color: map-get($value, text)
  .inner
    @if map-has-key($value, color)
      color: map-get($value, color)
    @if map-has-key($value, bg)
      background-color: map-get($value, bg)
    @if map-has-key($value, border)
      @if map-has-key($value, color)
        box-shadow: 0 0 0 1px rgba(map-get($value, color), .8), 0 0 0 3px rgba(map-get($value, border), .8)



.form-input
  position: relative
  vertical-align: middle
  display: inline-block
  input,
  textarea,
    width: 100%
  .inner
    background: transparent
    display: inline-block
    line-height: 1.25
    font-weight: 400
    vertical-align: middle
    white-space: nowrap
    border: 1px solid transparent
    padding: .5rem .75rem
    font-size: 1rem
    border-radius: .25rem
    transition: all .15s ease-in-out
    &:focus
      outline: 0
  .validation-message
    font-size: 1rem
    padding-left: .75rem
    font-weight: 400
    display: inline-block
    vertical-align: middle
    white-space: nowrap
  &.disabled
    .inner
      cursor: default
  &.block
    display: block
    .inner
      width: 100%
      display: block
  @include input-type-mixin($input)
  @if map-has-key($input, disabled)
    &.disabled
      @include input-type-mixin(map-get($input, disabled))
  @if map-has-key($input, focus)
    &.focus
      @include input-type-mixin(map-get($input, focus), 1)
  @if map-has-key($input, valid)
    &.valid
      @include input-type-mixin(map-get($input, valid), 2)
  @if map-has-key($input, invalid)
    &.invalid
      @include input-type-mixin(map-get($input, invalid), 2)
  .original
    width: 1px
    height: 1px
    position: absolute
    z-index: -1
    opacity: 0


.input-check
  label
    display: inline-flex
    padding-left: 1.25rem
    margin-right: 1rem
    margin-bottom: 0
  .inner
    border: 0
    padding: 0
    position: absolute
    left: 0
    top: .3rem
    display: block
  &.input-custom
    .inner
      width: 1rem
      height: 1rem
      top: .25rem
      background: transparent no-repeat center center
      background-size: 50% 50%
    &.input-checkbox
      .inner
        border-radius: .2rem
      &.checked
        .inner
          background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23fff' d='M6.564.75l-3.59 3.612-1.538-1.55L0 4.26 2.974 7.25 8 2.193z'/%3E%3C/svg%3E")
      &.indeterminate
        .inner
          background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 4'%3E%3Cpath stroke='%23fff' d='M0 2h4'/%3E%3C/svg%3E")
    &.input-radio
      .inner
        border-radius: 50%
      &.checked
        .inner
          background-image: url("data:image/svg+xml;charset=utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='-4 -4 8 8'%3E%3Ccircle r='3' fill='%23fff'/%3E%3C/svg%3E")
    @include input-custom-type-mixin($input-custom)
    @if map-has-key($input-custom, focus)
      &.focus
        @include input-custom-type-mixin(map-get($input-custom, focus))
    @if map-has-key($input-custom, checked)
      &.checked
        @include input-custom-type-mixin(map-get($input-custom, checked))
    @if map-has-key($input-custom, disabled)
      &.disabled
        @include input-custom-type-mixin(map-get($input-custom, disabled))
    @if map-has-key($input-custom, indeterminate)
      &.indeterminate
        @include input-custom-type-mixin(map-get($input-custom, indeterminate))


.input-large
  .inner
    padding: .5rem 1rem
    font-size: 1.25rem
    line-height: 1.5
    border-radius: .3rem
  .validation-message
    font-size: 1.25rem
.input-small
  .inner
    padding: .375rem .5rem
    font-size: .875rem
    border-radius: .2rem
  .validation-message
    font-size: .875rem
.input-smallr
  .inner
    line-height: 1.2
    padding: .25rem .4rem
    font-size: .75rem
    border-radius: .15rem
  .validation-message
    font-size: .75rem
.form-input.input-select
  .inner
    height: 2.25rem
    height: calc(2.25rem + 2px)
  &.input-large
    .inner
      height: 2.875rem
      height: calc(2.875rem + 2px)
  &.input-small
    .inner
      height: 1.8125rem
      height: calc(1.8125rem + 2px)
  &.input-smallr
    .inner
      height: 1.3755rem
      height: calc(1.3755rem + 2px)
</style>
<script>
/* @flow */
import FormDataList from './DataList'
export default {
  components: {
    FormDataList,
  },
  props: {
    block: {
      type: Boolean,
    },
    custom: {
      type: Boolean,
    },
    valid: {
      type: Boolean,
    },
    invalid: {
      type: Boolean,
    },

    validate: {
      type: [Boolean, Function]
    },


    options: {
      type: [Array, Function]
    },

    size: {
      type: String,
      default: 'medium',
    },

    search: {
      type: Boolean,
    },
    // autosize: {
    //
    // },
    //
    // resize: {
    // },

    type: {
      type: String,
      default: 'text',
    },

    id: {
    },
    name: {
    },
    value: {
    },
    check: {
    },
    disabled: {
    },
    max: {
    },
    min: {
    },
    step: {
    },
    maxlength: {
    },
    minlength: {
    },
    placeholder: {
    },
    pattern: {
    },
    required: {
    },
    rows: {
    },
    autofocus: {
    },
    autoComplete: {
    },
    readonly: {
    },
    indeterminate: {
    },
    formn: {
    },
    multiple: {
    },
  },


  data() {
    return {
      focus: false,
      isValid: null,
      selfValue: this.value,
    }
  },

  watch: {
    value(value) {
      if (value !== this.selfValue) {
        this.selfValue = value
      }
    },
    selfValue(value) {
      this.$emit('input', value)
      this.$emit('change', value)
      this.onValidate(true)
    },
  },

  computed: {
    isCheck() {
      return this.type === 'radio' || this.type === 'checkbox'
    },
    className() {
      let validName
      if (this.valid) {
        validName = 'valid'
      } else if (this.invalid) {
        validName = 'invalid'
      } else if (this.validate && this.isValid !== null) {
        validName = this.isValid ? 'valid' : 'invalid'
      }

      return [
        'form-input',
        this.custom ? 'input-custom' : undefined,
        this.isCheck ? 'input-check' : undefined,
        this.isCheck ? undefined : 'input-' + this.size,
        'input-' + this.type,
        this.block ? 'block' : undefined,
        this.focus ? 'focus' : undefined,
        this.disabled ? 'disabled' : undefined,
        this.checked ? 'checked' : undefined,
        this.indeterminate && this.type === 'checkbox' ? 'indeterminate' : undefined,
        validName,
      ]
    },
    checked() {
      switch (this.type) {
        case 'radio':
          return this.check === this.selfValue
        case 'checkbox':
          if (this.check === undefined) {
            return Boolean(this.selfValue)
          }
          return this.selfValue.indexOf(this.check) !== -1
        default:
          return false
      }
    }
  },

  methods: {
    onValue(e) {
      let el = e.target
      let oldValue = this.selfValue
      let newValue = oldValue
      let index
      if (this.type === 'checkbox') {
        if (this.check === undefined) {
          newValue = el.checked
        } else if (typeof oldValue !== 'object' || !oldValue) {
          newValue = el.checked ? this.check : undefined
        } else {
          index = oldValue.indexOf(this.check)
          if (el.checked) {
            if (index === -1) {
              newValue = newValue.concat([this.check])
            }
          } else if (index !== -1) {
            newValue = newValue.concat([])
            newValue.splice(index, 1)
          }
        }
      } else {
        newValue = el.value
      }
      if (newValue === oldValue) {
        return
      }
      this.selfValue = newValue
    },
    onFocus(e) {
      this.focus = true
      this.$emit('focus', e)
    },
    onBlur(e) {
      this.focus = false
      this.$emit('blur', e)
      this.onValidate()
    },

    onValidate(change) {
      if (!this.validate) {
        return
      }
      if (this.validateTimeer) {
        clearTimeout(this.validateTimeer)
        this.validateTimeer = null
      }

      if (change) {
        this.validateTimeer = setTimeout(() => {
          this.validateTimeer = null
          let input = this.$refs.input
          if (input && input.validity && input.validity.customError) {
            this.setValidity('')
          }
          this.checkValidity()
        }, 250)
      } else {
        this.checkValidity()
      }
    },

    onInvalid() {
      let input = this.$refs.input
      if (!input) {
        return
      }
      this.isValid = !input.validationMessage
    },


    setValidity(message = '') {
      let input = this.$refs.input
      if (!input) {
        return
      }
      this.isValid = !message
      if (input.setCustomValidity) {
        input.setCustomValidity(message)
      }
    },

    checkValidity() {
      let input = this.$refs.input
      if (!input) {
        return
      }

      // 验证失败
      if (input.checkValidity && !input.checkValidity()) {
        return
      }

      // 自定义验证失败
      if (this.validate && typeof this.validate === 'function') {
        try {
          if (!this.validate(this.value, input)) {
            throw new Error('Invalid')
          }
        } catch (e) {
          this.setValidity(e.message || 'Invalid')
          return
        }
      }

      // 成功
      this.setValidity()
    },
  },

  mounted() {
    if (this.selfValue !== '') {
      this.checkValidity()
    }
  },
  updated() {
    if (this.type === 'checkbox' && this.$refs.input) {
      this.$refs.input.indeterminate = Boolean(this.indeterminate)
    }
  },
}
</script>
