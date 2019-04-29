const nconf = require('nconf')
const restify = require('restify')
const redis = require('redis')
const logger = require('./log')

nconf.argv()
  .env('__')
  .file('./config.json')

nconf.required([
  'td_redis:host'
])

const redisClient = redis.createClient({
  'host': nconf.get('td_redis:host'),
  'port': nconf.get('td_redis:port') || 6379
})

redisClient.on('error', (error) => {
  logger.log('error', `redis error! ${error}`)
  setTimeout(() => { process.exit(5) }, 5000)
})

const server = restify.createServer()

require('./routes/berths')(server, redisClient)
require('./routes/signals')(server, redisClient)

server.listen(3000, () => {
  console.log(`${server.name} listening on ${server.url}`)
})
