var winston = require('winston')

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: 'info'
    })
  ]
})
module.exports = logger
