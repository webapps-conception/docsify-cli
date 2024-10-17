'use strict'

const serveStatic = require('serve-static')
const connect = require('connect')
const livereload = require('connect-livereload')
const history = require('connect-history-api-fallback')
const lrserver = require('livereload')
const open = require('open')
const chalk = require('chalk')
const logger = require('../util/logger')
const {exists, resolve} = require('../util')
const getPort = require('get-port')
const morgan = require('morgan')
const fs = require('fs')
const moment = require('moment-timezone')

// https://www.npmjs.com/package/morgan
// https://medium.com/front-end-weekly/node-js-logs-in-local-timezone-on-morgan-and-winston-9e98b2b9ca45
morgan.token('date', (req, res, tz) => {
  return moment().tz(tz).format()
})
// https://momentjs.com/timezone/
morgan.format('myformat', ':remote-addr - :remote-user [:date[Europe/Paris]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')

module.exports = function (
  path,
  openInBrowser,
  port,
  ip,
  livereloadPort,
  indexName,
  log
) {
  getPort({port})
    .then(p => {
      port = p
      return getPort({port: livereloadPort})
    })
    .then(p => {
      livereloadPort = p
    })
    .then(_ => {
      path = resolve(path || '.')
      const indexFileName = indexName || 'index.html'
      const indexFile = resolve(path, indexFileName)

      if (!exists(indexFile)) {
        const msg =
          '\nNo docs found ' +
          indexFile +
          '\nPlease run ' +
          chalk.green('docsify init') +
          ' first.\n'
        console.log(msg)
        process.exit(0)
      }

      const server = connect()

      // Create a write stream (in append mode)
      if (fs.existsSync(log)) {
        console.log('Log file: ', log)
        const accessLogStream = fs.createWriteStream(log, {flags: 'a'})
        server.use(morgan('myformat', {stream: accessLogStream}))
      } else {
        server.use(morgan('myformat'))
      }

      server.use(
        livereload({
          port: livereloadPort
        })
      )
      server.use(history({index: '/' + indexFileName}))
      server.use(serveStatic(path, {index: indexName}))
      server.listen(port, ip)
      lrserver
        .createServer({
          extraExts: ['md'],
          exclusions: ['node_modules/'],
          port: livereloadPort
        })
        .watch(path)

      if (openInBrowser) {
        open(`http://${ip}:${port}`)
      }

      const msg =
        '\nServing ' +
        chalk.green(`${path}`) +
        ' now.\n' +
        'Listening at ' +
        chalk.green(`http://${ip}:${port}`) +
        '\n'
      console.log(msg)
    })
    .catch(err => {
      logger.error(err.message)
    })
}
