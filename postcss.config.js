const precss               = require('precss')
const autoprefixer         = require('autoprefixer')
module.exports = {
  loader: 'postcss-loader',
  plugins() {
    return [
      precss,
      autoprefixer
    ]
  }
}
