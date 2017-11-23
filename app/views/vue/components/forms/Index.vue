<template>
<form class="form-index" ref="form" v-on="$listeners">
  <slot></slot>
</form>
</template>

<script>
/* @flow */
export default {
  methods: {
    reportValidity(data) {
      if (data !== undefined) {
        this.setValidity(data)
      }
      let form = this.$refs.form
      if (!form.reportValidity) {
        return
      }
      this.$refs.form.reportValidity()
    },

    setValidity(data) {
      let form = this.$refs.form
      let items = {}
      for (let i = 0; i < form.elements.length; i++) {
        let el = form.elements[i]
        let name = el.name || el.id
        if (name) {
          items[name] = el
        }
      }

      if (!data || !data.messages) {
        for (let name in items) {
          if (items[name].setCustomValidity) {
            items[name].setCustomValidity('')
          }
        }
        return
      }

      for (let i = 0; i < data.messages.length; i++) {
        let message = data.messages[i]
        let path = message.path
        let value
        if (!path) {
          continue
        }
        if (!items[path]) {
          path = path.replace(/([^A-Z])([A-Z]([^A-Z]|$))/g, (value1, value2, value3) => value2 + '_' + value3.toLowerCase())
          if (!items[path]) {
            path = path.replace(/_/g, '-')
            if (!items[path]) {
              continue
            }
          }
        }
        let defaultMessage = message.defaultMessage || message.message || 'Invalid'
        if (message.properties) {
          value = this.$t(message.properties.message.indexOf('.') === -1 ? 'errors.' + message.properties.message : message.properties.message, defaultMessage, message.properties)
        } else if (message.translate) {
          value = this.$t(message.message.indexOf('.') === -1 ? 'errors.' + message.message : message.message, defaultMessage, message)
        } else {
          value = message.message || defaultMessage
        }
        items[path].setCustomValidity(value)
      }
    }
  }
}
</script>
