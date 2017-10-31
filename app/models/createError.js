/* @flow */
import createHttpError, { HttpError }  from 'http-errors'
import statuses from 'statuses'
import locale from './locale/default'


export default function createError(error: mixed, message?: string, props?: Object): HttpError {
  let result: HttpError
  if (!error) {
    result = createHttpError(500, message, props)
  } else if (typeof error === 'number') {
    result = createHttpError(error, message, props)
  } else if (error instanceof HttpError) {
    result = error
    if (props) {
      for (let key in props) {
        result[key] = props[key]
      }
    }
  } else if (typeof error === 'object') {
    let status: number
    if (typeof error.status === 'number' && error.status >= 400 && error.status < 600) {
      status = error.status
    } else if (typeof error.statusCode === 'number' && error.statusCode >= 400 && error.statusCode < 600) {
      status = error.statusCode
    } else if (error.code === 'ENOENT') {
      // ENOENT support
      status = 404
    } else if (error.code === 'HPE_INVALID_EOF_STATE' || error.code === 'ECONNRESET' || error.message === 'Request aborted') {
      status = 408
    } else if (error.name === 'ValidationError' || error.name === 'ValidatorError') {
      status = 403
    } else {
      status = 500
    }

    let message2 = String(message || error.message || statuses[status] || 'Server error')

    if (error instanceof Error) {
      error.status = status
      result = createHttpError(error, message2, props)
    } else {
      result = createHttpError(status, message2, { ...error, ...props })
    }
  } else {
    result = createHttpError(500, String(message || error), props)
  }



  delete result.statusCode

  if (!result.properties) {
    if (locale.getLanguagePackValue(['errors', result.message])) {
      // $flow-disable-line
      result.type = result.message
    }

    if (typeof result.type === 'string') {
      let value = locale.getLanguagePackValue(['errors', result.type])
      if (value) {
        result.message = value
      }
    }

    // $flow-disable-line
    result.properties = { ...result }

    result.message = locale.format(result.message, result)
  }

  return result
}
