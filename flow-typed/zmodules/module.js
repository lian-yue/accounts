/* @flow */

declare var global: {[key: string]: any}

declare var module: {
  hot: {
    accept(path?: string | Array<string> | () => void, callback?: () => void): void
  }
}

declare var __SERVER__: boolean

declare class Error {
  message: string,
  name: string,
  stack: string,
  code?: string | number,
  status?: number,
  statusCode?: number,
  headerSent?: boolean,
  headers: {[key: string]: string | string[]},
  errors?: {[string]: Error},
  messages?: Array<Object>,
  constructor(message: string, fileName?: string, lineNumber?: number): Error,
}
