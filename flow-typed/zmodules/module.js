/* @flow */

declare var global: {[key: string]: any}

declare var module: {
  hot: {
    accept(path?: string | Array<string> | () => void, callback?: () => void): void
  }
}

declare var __SERVER__: boolean
