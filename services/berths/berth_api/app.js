const nconf = require('nconf')
const restify = require('restify')
const redis = require('redis')

nconf.argv()
  .env('__')
  .file('./config.json')

nconf.required([
  'berths_redis:host'
])

const redisClient = redis.createClient({
  'host': nconf.get('berths_redis:host'),
  'port': nconf.get('berths_redis:port') || 6379
})

const server = restify.createServer()

require('./routes/berths')(server, redisClient)

server.listen(3000, () => {
  console.log(`${server.name} listening on ${server.url}`)
})
