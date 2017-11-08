/* @flow */
import Locale from 'models/locale'

class VueLocale extends Locale {
  store: Object

  setStore(store: Object): boolean {
    this.store = store
    return true
  }

  changeLocale(): Promise<void> {
    let value: string = 'en'
    let state: Object = this.store.state
    if (state.route.query.locale) {
      value = state.route.query.locale
    } else if (state.token && state.token.user && state.token.user.locale) {
      value = state.token.user.locale
    } else if (state.token && state.token.locale) {
      value = state.token.locale
    }

    this.setName(value)
    let language = this.getLanguage()
    if (this.languagesPack[language]) {
      return Promise.resolve()
    }

    if (__SERVER__) {
      // $flow-disable-line
      this.setLanguagePack(require('models/locale/languages/' + language))
      return Promise.resolve()
    }
    // $flow-disable-line
    return import('models/locale/languages/' + language).then(languagesPack => {
      this.setLanguagePack(languagesPack)
    })
  }


  setName(name: string): boolean {
    let res: boolean = super.setName(name)
    this.store.commit('locale/CHANGED', { name: this.getName(), language: this.getLanguage(), timezone: this.getTimezone() })
    return res
  }

  setLanguage(language: string): boolean {
    let res: boolean = super.setLanguage(language)
    this.store.commit('locale/CHANGED', { language: this.getLanguage() })
    return res
  }

  setTimezone(timezone: string): boolean {
    let res: boolean = super.setTimezone(timezone)
    this.store.commit('locale/CHANGED', { timezone: this.getTimezone() })
    return res
  }
}


export default function createLocale(store: Object): VueLocale {
  let locale = new VueLocale
  locale.setStore(store)

  store.registerModule('locale', {
    namespaced: true,
    state: {
      name: locale.getName(),
      language: locale.getLanguage(),
      timezone: locale.getTimezone()
    },
    mutations: {
      CHANGED(state, payload) {
        if (payload.name) {
          state.name = payload.name
        }
        if (payload.language) {
          state.language = payload.language
        }
        if (payload.timezone) {
          state.timezone = payload.timezone
        }
      }
    }
  })



  store.watch(
    state => state.locale,
    value => {
      if (value.name !== locale.name) {
        locale.setName(value.name)
      }
      if (value.language !== locale.language) {
        locale.setLanguage(value.language)
      }
      if (value.timezone !== locale.timezone) {
        locale.setTimezone(value.timezone)
      }
    },
    { sync: true }
  )


  return locale
}
