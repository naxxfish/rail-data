const logger = require('./log.js')
const amqp = require('amqplib')
const nconf = require('nconf')
nconf.argv()
  .env('__')
  .file('./config.json')

nconf.required([
  'broker:host',
  'broker:port',
  'broker:username',
  'broker:password',
  'broker:protocol',
  'berths_redis:host'
])

const redis = require('redis')
const redisClient = redis.createClient({
  host: nconf.get('berths_redis:host')
})

const CClassProcessor = require('./lib/CClassProcessor')

function onTDMessage (message) {
  var TDmessages = JSON.parse(message.content.toString())
  TDmessages.forEach((message) => {
    CClassProcessor.parseMessage(message, redisClient)
  })
}

amqp.connect({
  hostname: nconf.get('broker:host'),
  port: nconf.get('broker:port'),
  username: nconf.get('broker:username'),
  password: nconf.get('broker:password'),
  protocol: nconf.get('broker:protocol')
}).then(async (connection) => {
  logger.log('info', `Connected to RabbitMQ at ${nconf.get('broker:host')}:${nconf.get('broker:port')}`)
  // close the connection nicely if we are killed
  process.once('SIGINT', () => { connection.close() })
  const channel = await connection.createChannel()
  channel.assertExchange(
    nconf.get('feeds:networkrail:subscriptions:td:local:exchangeName'),
    nconf.get('feeds:networkrail:subscriptions:td:local:exchangeType'),
    { durable: true })
    .then(() => {
      return channel.assertQueue('', { exclusive: true })
    })
    .then((queueOk) => {
      return channel.bindQueue(
        queueOk.queue,
        nconf.get('feeds:networkrail:subscriptions:td:local:exchangeName'),
        nconf.get('feeds:networkrail:subscriptions:td:local:routingKey'))
        .then(() => {
          return queueOk.queue
        })
    })
    .then((queue) => {
      return channel.consume(queue, onTDMessage, { noAck: true })
    })
    .then(() => {
      logger.log('info', 'Subscribed to queue')
    })
}).catch((error) => {
  logger.log('error', `Error connecting to broker: ${error}`)
  setTimeout(() => { process.exit(5) }, 5000)
})
