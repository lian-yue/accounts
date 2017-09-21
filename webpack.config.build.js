const fs          = require('fs')
const packageInfo = require('./package')
let configClient  = require('./webpack.config.client')
let configServer  = require('./webpack.config.server')

if (!process.env.npm_config_noVersion && process.env.NODE_ENV !== 'development') {
  let version = packageInfo.version.split('.')
  version[version.length - 1] = parseInt(version[version.length - 1], 10) + 1
  packageInfo.version = version.join('.')


  process.on('exit', function (code) {
    if (code) {
      return
    }
    fs.writeFileSync('./package.json', JSON.stringify(packageInfo, null, '  '))
  })
}


let config = []
if (!(configClient instanceof Array)) {
  configClient = [configClient]
}
if (!(configServer instanceof Array)) {
  configServer = [configServer]
}

if (!process.env.npm_config_noServer) {
  config.push(...configServer)
}

if (!process.env.npm_config_noClient) {
  config.push(...configClient)
}

module.exports = config
