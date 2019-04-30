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

const server = restify.createServer()
const io = require('socket.io')(server.server, { path: '/td/websocket' })

const redisErrorHandler = (error) => {
  logger.log('error', `redis error! ${error}`)
  setTimeout(() => { process.exit(5) }, 5000)
}

const queryRedisClient = redis.createClient({
  'host': nconf.get('td_redis:host'),
  'port': nconf.get('td_redis:port') || 6379
})
queryRedisClient.on('error', redisErrorHandler)

const pubsubRedisClient = redis.createClient({
  'host': nconf.get('td_redis:host'),
  'port': nconf.get('td_redis:port') || 6379
})

pubsubRedisClient.on('error', redisErrorHandler)

require('./routes/berths')(server, queryRedisClient)
require('./routes/signals')(server, queryRedisClient)

io.sockets.on('connection', (socket) => {
  socket.on('room', (room) => {
    console.log(`client joined ${room}`)
    socket.join(room)
  })
})

pubsubRedisClient.psubscribe('signal.VC.*')
pubsubRedisClient.psubscribe('berth.VC.*')
const redisWebsocketDispatcher = (channel, message) => {
  if (channel.startsWith('signal')) {
    logger.log('debug', `sending websocket signal event to ${channel} room - ${message}`)
    io.to(`${channel}`).emit('signal', message)
  } else if (channel.startsWith('berth')) {
    logger.log('debug', `sending websocket berth event to ${channel} room - ${message}`)
    io.to(`${channel}`).emit('berth', message)
  }
}
pubsubRedisClient.on('message', redisWebsocketDispatcher)
pubsubRedisClient.on('pmessage', (pattern, channel, message) => {
  redisWebsocketDispatcher(channel, message)
})

setInterval(() => {
  io.to('clock').emit('time', { time: new Date() })
}, 1000)

server.listen(3000, () => {
  console.log(`${server.name} listening on ${server.url}`)
})
