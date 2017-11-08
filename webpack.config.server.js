const fs                   = require('fs')
const path                 = require('path')
const webpack              = require('webpack')
const webpackMerge         = require('webpack-merge')
const { VueSSRServerPlugin } = require('vue-ssr-webpack-plugin')


const packageInfo       = require('./package')
const site              = require('./config/site')
const vueLoader         = require('./vueLoader')


const ignoreModules = fs.readdirSync('node_modules')

process.env.NODE_ENV = process.env.NODE_ENV || 'production'

const isDev = process.env.NODE_ENV === 'development'




function config(opts = {}) {
  const names = Object.keys(opts.entry)
  const publicPath = site.assets + names[0] + '/'
  return webpackMerge({
    output: {
      path: path.resolve(__dirname, isDev ? 'dev' : 'dist'),
      filename: '[name].js',
      chunkFilename: '[chunkhash:8].[name].chunk.js',
      libraryTarget: 'commonjs2',
    },

    target: 'node',

    node: {
      console: false,
      global: true,
      process: true,
      Buffer: true,
      __dirname: false,
      __filename: false,
      setImmediate: true
    },

    resolve: {
      modules: [
        path.join(__dirname, 'node_modules'),
        path.join(__dirname, isDev ? 'dev' : 'dist'),
      ],

      alias: {
        package: path.join(__dirname, 'package.json'),
        config: path.join(__dirname, 'config'),
        models: path.join(__dirname, 'app/models'),
        viewModels: path.join(__dirname, 'app/viewModels'),
        views: path.join(__dirname, 'app/views'),
      },

      extensions: [
        isDev ? '.dev.vue' : '.prod.vue',
        isDev ? '.dev.js' : '.prod.js',
        '.vue',
        '.js',
        '.json',
        '.ejs',
      ],
    },


    externals: [
      function (context, request, callback) {
        let pathStart = request.split('/')[0]

        // ! 开始指定 loader
        if (!pathStart || pathStart[0] === '!' || request.indexOf('?') !== -1) {
          return callback()
        }

        // 忽略的模块
        if (ignoreModules.indexOf(pathStart) !== -1) {
          return callback(null, 'commonjs2 ' + request)
        }

        // config 配置文件
        if (pathStart === 'config') {
          return callback(null, names[0] === 'vue' ? 'commonjs2 ../../' + request : 'commonjs2 ../' + request)
        }

        //  package 配置文件
        if (pathStart === 'package') {
          return callback(null, 'commonjs2 ../' + request)
        }

        //  vue-ssr-bundle
        if (pathStart === 'vue-ssr-bundle' && !isDev) {
          return callback(null, 'commonjs2 ./' + request)
        }
        return callback()
      }
    ],


    devServer: {
      hot: true,
      inline: true,
      noInfo: true,
      clientLogLevel: 'warning',
      overlay: {
        warnings: true,
        errors: true
      },
    },

    module: {
      rules: [
        {
          test: /\.ejs$/,
          use: [
            {
              loader: 'ejs-loader',
            },
          ],
        },
        {
          test: /\.jsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: {
                cacheDirectory: isDev
              }
            },
            {
              loader: 'eslint-loader',
            }
          ],
        },
        vueLoader,
        {
          test: /\.(gif|jpe?g|png|webp|svg)(\?.*)?$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 4096,
                name: 'images/[name].[ext]?[hash:8]',
                publicPath,
                useRelativePath: !isDev,
              }
            }
          ]
        },
        {
          test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 4096,
                name: 'fonts/[name].[ext]?[hash:8]',
                publicPath,
                useRelativePath: !isDev,
              }
            }
          ]
        },
      ]
    },


    plugins: [
      new webpack.BannerPlugin(`Name: ${packageInfo.name}\nVersion: ${packageInfo.version}\nAuthor: ${packageInfo.author}Description: ${packageInfo.description}`),
      new webpack.DefinePlugin({
        'process.env': {
          NODE_ENV: JSON.stringify(process.env.NODE_ENV),
          VUE_ENV: JSON.stringify('server'),
          version: JSON.stringify(packageInfo.version),
        },
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        __ENV__: JSON.stringify(process.env.NODE_ENV),
        __SERVER__: true,
      }),
      new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
        },
        comments: true,
        beautify: true,
        mangle: false,
        output: {
          indent_level: 2,
        },
        sourceMap: true,
      }),
      new webpack.NoEmitOnErrorsPlugin(),
      new webpack.NamedModulesPlugin(),
    ],

    devtool: isDev ? 'eval-source-map' : 'source-map'
  }, opts)
}



const index = config({
  entry: {
    index: [
      path.resolve(__dirname, 'app'),
    ],
  },
})

const vue = config({
  entry: {
    vue: [
      path.resolve(__dirname, 'app/views/vue/server'),
    ],
  },
  plugins: [
    new VueSSRServerPlugin(),
  ],
})


if (isDev) {
  index.entry.index.unshift('webpack/hot/poll?1000')
  index.plugins.push(new webpack.HotModuleReplacementPlugin())
}

module.exports = [vue, index]
