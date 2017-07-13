import koaBody from 'koa-body'
import Stream from 'stream'

const bodyParse = koaBody({
  formLimit: '1mb',
  jsonLimit: '1mb',
  textLimit: '1mb',
});

export default async (ctx, next) => {
  if (['HEAD', 'GET', 'DELETE', 'OPTIONS'].indexOf(ctx.method) != -1) {
    await next();
    return;
  }

  await bodyParse(ctx, async () => {
    if (!(ctx.request.body instanceof Object) || Buffer.isBuffer(ctx.request.body) || ctx.request.body instanceof Stream) {
      ctx.throw('Body parameter error', 400)
    }
    await next();
  });
}
