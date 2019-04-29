const logger = require('./lib/log')
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
  'td_redis:host'
])

const redis = require('redis')
const redisClient = redis.createClient({
  host: nconf.get('td_redis:host')
})

const CClassProcessor = require('./lib/CClassProcessor')
const SClassProcessor = require('./lib/SClassProcessor')

function onTDMessage (recievedMessageFromBroker) {
  try {
    var TDmessages = JSON.parse(recievedMessageFromBroker.content.toString())
    TDmessages.forEach((messageFromTDMessageArray) => {
      // Each object has a single property, who's key is the type of message it is
      // however, each object also has a msg_type property within it too with the actual message type!
      const message = messageFromTDMessageArray[Object.keys(messageFromTDMessageArray)[0]]
      if (message.msg_type.startsWith('C')) {
        CClassProcessor.parseMessage(message, redisClient)
      } else if (message.msg_type.startsWith('S')) {
        SClassProcessor.parseMessage(message, redisClient)
      } else {
        logger.log('error', `Unknown TD message recieved: ${message.type}`)
      }
    })
  } catch (e) {
    logger.log('error', {
      'error': 'Error parsing message from TD',
      'message': recievedMessageFromBroker.content.toString(),
      'e': e
    })
  }
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
