/* @flow */
import queryString from 'query-string'

export function toUrl(path: string, query: string | Object = '', state?: Object): string {
  let search: string
  if (!query) {
    search = ''
  } else if (typeof query === 'object') {
    search = queryString.stringify(query)
    if (search) {
      search = '?' + search
    }
  } else {
    search = query.substr(0, 1) === '?' ? query : '?' + query
  }
  if (state) {
    return state.site.protocol + ':' + state.site.url + path + search
  }
  return path + search
}
