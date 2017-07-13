import koaBody from 'koa-body'

const bodyParse = koaBody({
  formLimit: '1mb',
  jsonLimit: '1mb',
  textLimit: '1mb',
  multipart: true,
  formidable: {
    maxFields: 10,
    maxFieldsSize: 1024 * 1024 * 20,
    keepExtensions: false,
    multiples: false,
  }
});

export default async (ctx, next) => {
  if (['HEAD', 'GET', 'DELETE', 'OPTIONS'].indexOf(ctx.method) === 0) {
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
