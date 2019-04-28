var winston = require('winston')

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: 'debug'
    })
  ]
})
module.exports = logger
