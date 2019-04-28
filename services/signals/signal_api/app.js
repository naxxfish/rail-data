const nconf = require('nconf')
const restify = require('restify')
const redis = require('redis')

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

const server = restify.createServer()

require('./routes/signals')(server, redisClient)

server.listen(3000, () => {
  console.log(`${server.name} listening on ${server.url}`)
})
