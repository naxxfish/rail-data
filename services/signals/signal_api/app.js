const nconf = require('nconf')
const restify = require('restify')
const redis = require('redis')
const bunyanWinston = require('bunyan-winston-adapter')
const logger = require('./log')

nconf.argv()
  .env('__')
  .file('./config.json')

nconf.required([
  'signals_redis:host'
])

const redisClient = redis.createClient({
  'host': nconf.get('signals_redis:host'),
  'port': nconf.get('signals_redis:port') || 6379
})

const server = restify.createServer({
  name: 'signal-api',
  version: '0.0.1',
  log: bunyanWinston.createAdapter(logger)
})
server.use(restify.fullResponse())
require('./routes/signals')(server, redisClient)

server.listen(3000, () => {
  logger.log('info', `${server.name} listening on ${server.url}`)
})
