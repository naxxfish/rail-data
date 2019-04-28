// b783f430-3e56-4c6b-9b35-2610d1d4f148
const winston = require('winston')
const amqp = require('amqplib')
const Prometheus = require('prom-client')
const Stomp = require('stompit')
const nconf = require('nconf')
const restify = require('restify')

// restify server for the purposes of serving Prometheus
const restifyServer = restify.createServer()
restifyServer.get('/metrics', (req, res, next) => {
  res.send(Prometheus.register.metrics())
  next()
})

restifyServer.listen(3000, () => {
  logger.log('info', `Restify server listening on ${restifyServer.url}`)
})
// Prometheus.collectDefaultMetrics({ timeout: 5000 })

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: 'debug'
    })
  ]
})

nconf.argv()
  .env('__')
  .file({ file: 'config.json' })

nconf.required([
  'broker:host',
  'broker:username',
  'broker:password',
  'broker:port',
  'feeds:networkrail:system_name',
  'feeds:networkrail:host',
  'feeds:networkrail:port',
  'feeds:networkrail:username',
  'feeds:networkrail:password'
])

function dieGracefully(amqChannel, stompConnection) {
  if (amqChannel) {
    amqChannel.close()
  }
  if (stompConnection) {
    stompConnection.disconnect()
  }
  setTimeout(() => { process.exit(5) }, 1000)
}

amqp.connect({
  hostname: nconf.get('broker:host'),
  port: nconf.get('broker:port'),
  username: nconf.get('broker:username'),
  password: nconf.get('broker:password'),
  protocol: nconf.get('broker:protocol')
})
  .then(async (connection) => {
    connection.on('close', (err) => {
      if (require('amqplib/lib/connection').isFatalError(err)) {
        logger.log('error', `RabbitMQ connection fatal error occurred ${err}`)
        dieGracefully(connection, null)
      }
      logger.log('info', 'RabbitMQ connection closed')
    })

    connection.on('error', (err) => {
      logger.log('error', `RabbitMQ encountered an error ${err}`)
    })

    process.once('SIGINT', () => {
      connection.close()
    })
    
    const channel = await connection.createChannel()
    logger.log('info', 'RabbitMQ ready, now requesting subscription to datafeeds')
    if (nconf.get('feeds:networkrail')) {
      logger.log('info', 'Connecting to Network Rail datafeeds')
      Stomp.connect({
        host: nconf.get('feeds:networkrail:host'),
        port: nconf.get('feeds:networkrail:port'),
        connectHeaders: {
          login: nconf.get('feeds:networkrail:username'),
          passcode: nconf.get('feeds:networkrail:password'),
          'heart-beat': '5000:5000',
          'client-id': `${nconf.get('feeds:networkrail:system_name')}-${nconf.get('feeds:networkrail:username')}`
        }
      }, (error, clientNetworkRail) => {
        clientNetworkRail.on('error', (error) => {
          logger.log('error', `Network Rail datafeeds connection error occurred ${error}`)
          dieGracefully(connection, clientNetworkRail)
        })
        if (error) {
          logger.log('error', `Error connecting to Network Rail datafeeds ${error.message}`)
          dieGracefully(connection, clientNetworkRail)
        }
        // periodically echo out our stats
        setInterval(() => {
          const subscriptions = nconf.get('feeds:networkrail:subscriptions')
          var metrics = []
          Object.keys(subscriptions).forEach((subscription) => {
            metrics.push({
              'subscription': subscription,
              'messages': Prometheus.register.getSingleMetric(`${subscription}_messages`).hashMap[''].value,
              'errors': Prometheus.register.getSingleMetric(`${subscription}_errors`).hashMap[''].value
            })
          })
          logger.log('info', metrics)
        }, 10 * 1000)
        const subscriptions = nconf.get('feeds:networkrail:subscriptions')
        if (clientNetworkRail !== null) {
          logger.log('info', 'connected to datafeeds STOMP, requesting subscriptions')
          logger.log('debug', { 'keys': Object.keys(subscriptions) })
          Object.keys(subscriptions).forEach((subscriptionId) => {
            const subscription = subscriptions[subscriptionId]
            logger.log('debug', subscription)
            channel.assertExchange(subscription.local.exchangeName, subscription.local.exchangeType, { durable: true })
              .then(() => {

              })
            logger.log('debug', `Subscribing to ${subscription.remoteTopic} and forwaring messages to ${subscription.local.exchangeName}`)
            const messageCounter = new Prometheus.Counter({
              name: `${subscriptionId}_messages`,
              help: `Messages passed from ${subscription.remoteTopic} to local broker`
            })
            const messageErrorCounter = new Prometheus.Counter({
              name: `${subscriptionId}_errors`,
              help: `Message errors from ${subscription.remoteTopic}`
            })
            const subscriptionCallback = (subscribeError, message) => {
              if (subscribeError) {
                logger.log('error', `Error subscribing to Network Rail datafeeds topic ${subscription.remoteTopic} ${subscribeError}`)
                return
              }
              const messageTimestamp = parseInt(message.headers.timestamp)
              const messageExpiresTimestamp = parseInt(message.headers.expires)
              messageCounter.inc()
              message.readString('utf-8', (messageError, body) => {
                logger.log('silly', body)
                if (messageError) {
                  messageErrorCounter.inc()
                  logger.log('error', `Message read error on message to ${subscription.id} - ${messageError.message}`)
                  return
                }
                channel.publish(
                  subscription.local.exchangeName,
                  subscription.local.routingKey,
                  Buffer.from(body, 'utf-8'),
                  {
                    contentType: 'application/json',
                    messageId: message.headers['message-id'],
                    expiration: messageExpiresTimestamp - messageTimestamp,
                    timestamp: messageTimestamp,
                    persistent: message.headers.persistent
                  }
                )
                clientNetworkRail.ack(message)
              })
            }
            var subscribeHeaders = {
              'destination': subscription.remoteTopic,
              'ack': 'client-individual'
            }
            if (nconf.get('feeds:networkrail:durability') === true) {
              const durableSubscriptionName = `${nconf.get('feeds:networkrail:system_name')}-${subscription.id}`
              logger.log('info', `requesting durable subscription to ${subscription.remoteTopic} with subscriptionName ${durableSubscriptionName}`)
              subscribeHeaders['activemq.subscriptionName'] = durableSubscriptionName
            } else {
              logger.log('info', `requesting non-durable subscription to ${subscription.remoteTopic}`)
            }
            clientNetworkRail.subscribe(subscribeHeaders, subscriptionCallback)
          })
        }
      })
    }
  })
  .catch((error) => {
    logger.log('error', `RabbitMQ error connecting ${error}`)
    setTimeout(() => { process.exit(5) }, 5000)
  })
