/* @flow */
import Stream from 'stream'
import koaBody from 'koa-body'

import type { Context } from 'koa'

const bodyParse = koaBody({
  formLimit: '1mb',
  jsonLimit: '1mb',
  textLimit: '1mb',
})

export default async (ctx: Context, next: () => Promise<void>) => {
  if (['HEAD', 'GET', 'DELETE', 'OPTIONS'].indexOf(ctx.method) !== -1) {
    await next()
    return
  }

  await bodyParse(ctx, async function () {
    if (!ctx.request.body || !(ctx.request.body instanceof Object) || Buffer.isBuffer(ctx.request.body) || ctx.request.body instanceof Stream) {
      ctx.throw(400, 'Body parameter error')
    }
    await next()
  })
}
