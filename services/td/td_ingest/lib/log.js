const winston = require('winston')
const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'td-ingest'
  },
  transports: [
    new winston.transports.Console({
      level: 'info',
      timestamp: true
    })
  ]
})
module.exports = logger
