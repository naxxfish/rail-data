const restify = require('restify')
const redis = require('redis')
const redisClient = redis.createClient({
  'host': process.env.REDIS_HOST || 'localhost',
  'port': process.env.REDIS_PORT || 6379
})

const server = restify.createServer()

require('./routes/signals')(server, redisClient)

server.listen(3000, () => {
  console.log(`${server.name} listening on ${server.url}`)
})
