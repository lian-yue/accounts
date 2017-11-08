/* @flow */
import type VueType from 'vue'
const mixin = {
  created() {
    this.$updateHeaders()
  },
  mounted() {
    this.$updateHeaders()
  },
  beforeUpdate() {
    this.$updateHeaders()
  },
  activated() {
    this.$updateHeaders()
  },
}

export default {
  installed: false,
  install(Vue: Class<VueType>) {
    if (this.installed) {
      return
    }
    this.installed = true
    Vue.prototype.$updateHeaders = function () {
      let options: Object = this.$options
      if (!options.headers) {
        return
      }
      let {
        html = {},
        title = [],
        link = [],
        meta = [],
        status,
      }: {
        html: Object,
        title: string[],
        link: Object[],
        meta: Object[],
        status?: number,
      } = options.headers.call(this)
      if (__SERVER__) {
        if (status && this.$ssrContext.context) {
          this.$ssrContext.context.status = status
        }


        this.$ssrContext.htmlAttrs = attrsToString(html)
        this.$ssrContext.title = title.join(' - ')

        this.$ssrContext.head = this.$ssrContext.head || ''
        for (let i = 0; i < link.length; i++) {
          let attrs = link[i]
          this.$ssrContext.head += '<link ' + attrsToString(attrs) + ' data-header />\n'
        }
        for (let i = 0; i < meta.length; i++) {
          let attrs = meta[i]
          this.$ssrContext.head += '<meta ' + attrsToString(attrs) + ' data-header />\n'
        }
      } else {
        // removeHead
        let elements = document.querySelectorAll('head link[data-header],head meta[data-header]')
        for (let i = 0; i < elements.length; i++) {
          let element = elements[i]
          if (element.parentNode) {
            element.parentNode.removeChild(element)
          }
        }
        document.title = ''
        if (document.documentElement) {
          let attributes = document.documentElement.attributes
          for (let i = 0; i < attributes.length; i++) {
            document.documentElement.removeAttribute(attributes[i].name)
          }
        }

        // html
        if (document.documentElement) {
          for (let key in html) {
            document.documentElement.setAttribute(key, html[key])
          }
        }

        // title
        document.title = title.join(' - ')


        let head = document.head || document.querySelector('head')

        // meta
        if (head) {
          for (let i = 0; i < meta.length; i++) {
            let attrs: Object = meta[i]
            let element = document.createElement('meta')
            for (let name in attrs) {
              element.setAttribute(name, attrs[name])
            }
            element.setAttribute('data-header', 'true')
            head.appendChild(element)
          }

          // link
          for (let i = 0; i < link.length; i++) {
            let attrs: Object = link[i]
            let element = document.createElement('link')
            for (let name in attrs) {
              element.setAttribute(name, attrs[name])
            }
            element.setAttribute('data-header', 'true')
            head.appendChild(element)
          }
        }


      }
    }
    Vue.mixin(mixin)
  }
}




function attrsToString(attrs: Object): string {
  let res = []
  for (let key in attrs) {
    let value = attrs[key]
    if (value === false || value === null || value === undefined) {
      continue
    }
    res.push(htmlencode(key) + '="' + htmlencode(String(value)) + '"')
  }
  return res.join(' ')
}


function htmlencode(str: string): string {
  return str.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\'/g, '&#39;')
    .replace(/\"/g, '&quot;')
}
