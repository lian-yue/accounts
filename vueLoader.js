const path                 = require('path')
const isDev = process.env.NODE_ENV === 'development'

module.exports = {
  test: /\.vue$/,
  use: [
    {
      loader: 'vue-loader',
      options: {
        preserveWhitespace: false,
        cssModules: {
          localIdentName: '[hash:base64:8]',
          camelCase: true,
        },
        loaders: {
          js: [
            {
              loader: 'babel-loader',
              options: {
                presets: [
                  [
                    'env',
                    {
                      modules: false
                    }
                  ],
                  'stage-0'
                ],
                plugins: [
                  [
                    'transform-runtime',
                    {
                      helpers: false,
                      polyfill: false,
                      regenerator: true,
                      moduleName: 'babel-runtime'
                    }
                  ]
                ],
                cacheDirectory: isDev
              }
            },
          ],
          css: [
            {
              loader: 'vue-style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                minimize: !isDev,
              },
            }
          ],
          sass: [
            {
              loader: 'vue-style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                minimize: !isDev,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                indentedSyntax: true,
                includePaths: [
                  path.join(__dirname, 'node_modules'),
                ],
              }
            },
          ],
          scss: [
            {
              loader: 'vue-style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                minimize: !isDev,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                sourceMap: true,
                includePaths: [
                  path.join(__dirname, 'node_modules'),
                ],
              },
            },
          ],
          postcss: [
            {
              loader: 'vue-style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                minimize: !isDev,
                sourceMap: true,
              },
            },
          ],
        }
      },
    },
    {
      loader: 'eslint-loader',
    }
  ],
}
