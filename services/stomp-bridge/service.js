// b783f430-3e56-4c6b-9b35-2610d1d4f148
const rabbit = require('rabbot')

const Stomp = require('stompit')
const nconf = require('nconf')

nconf.argv()
  .env('__')
  .file({ file: 'config.json' })

nconf.required([
  'broker:host',
  'broker:username',
  'broker:password',
  'broker:port',
  'feeds:networkrail:host',
  'feeds:networkrail:port',
  'feeds:networkrail:username',
  'feeds:networkrail:password'
])

function onNetworkRailSTOMPConnect (error, clientNetworkRail) {
  var counters = {}
  if (error) {
    console.error(`Error connecting to Network Rail datafeeds ${error.message}`)
    process.exit(5)
  }
  console.log('connected to datafeeds STOMP')
  const subscriptions = nconf.get('feeds:networkrail:subscriptions')
  if (clientNetworkRail !== null) {
    console.log('subscriptions', subscriptions)
    subscriptions.forEach((subscription) => {
      rabbit.addExchange(subscription.local.exchangeName, subscription.local.exchangeType)
      console.log(`subscrition from ${subscription.remoteTopic} forwaring messages to ${subscription.localTopic}`)
      counters[subscription.id] = 0
      const subscriptionCallback = (subscribeError, message) => {
        if (subscribeError) {
          console.error(`Error subscribing to Network Rail datafeeds topic ${subscription.remoteTopic} ${subscribeError}`)
          return
        }
        const messageTimestamp = parseInt(message.headers.timestamp)
        const messageExpiresTimestamp = parseInt(message.headers.expires)
        counters[subscription.id]++
        if ((counters[subscription.id] % 10) === 0) {
          console.log(`${counters[subscription.id]} messages from ${subscription.remoteTopic} to ${subscription.local.exchangeName}`)
        }
        message.readString('utf-8', (messageError, body) => {
          if (messageError) {
            console.error(`Message read error on message to ${subscription.id} - ${messageError.message}`)
            return
          }
          rabbit.publish(subscription.local.exchangeName, {
            body: body,
            routingKey: subscription.local.routingKey,
            contentType: 'application/json',
            correlationId: message.headers['message-id'],
            expiresAfter: messageExpiresTimestamp - messageTimestamp,
            timestamp: messageTimestamp,
            persistent: message.headers.persistent
          })
          clientNetworkRail.ack(message)
        })
      }
      var subscribeHeaders = {
        'destination': subscription.remoteTopic,
        'ack': 'client-individual'
      }
      if (nconf.get('feeds:networkrail:durability') === true) {
        const durableSubscriptionName = `${nconf.get('feeds:networkrail:system_name')}-${subscription.id}`
        console.log(`requesting durable subscription to ${subscription.remoteTopic} with subscriptionName ${durableSubscriptionName}`)
        subscribeHeaders['activemq.subscriptionName'] = durableSubscriptionName
      } else {
        console.log(`requesting non-durable subscription to ${subscription.remoteTopic}`)
      }
      clientNetworkRail.subscribe(subscribeHeaders, subscriptionCallback)
    })
  }
}

rabbit.configure({
  connection: {
    server: [ nconf.get('broker:host') ],
    port: nconf.get('broker:port'),
    vhost: '%2f',
    user: nconf.get('broker:username'),
    pass: nconf.get('broker:password'),
    timeout: 1000,
    failAfter: 30,
    retryLimit: 400
  }
})
  .then(() => {
    console.log('RabbitMQ connection set up')
    if (nconf.get('feeds:networkrail')) {
      console.log('Connecting to Network Rail datafeeds')
      Stomp.connect({
        host: nconf.get('feeds:networkrail:host'),
        port: nconf.get('feeds:networkrail:port'),
        connectHeaders: {
          login: nconf.get('feeds:networkrail:username'),
          passcode: nconf.get('feeds:networkrail:password'),
          'heart-beat': '5000:5000',
          'client-id': `${nconf.get('feeds:networkrail:system_name')}-${nconf.get('feeds:networkrail:username')}`
        }
      }, onNetworkRailSTOMPConnect)
    }
  })
  .catch((error) => {
    console.log('RabbitMQ error connecting ')
    console.error(error)
    setTimeout(() => { process.exit(5) }, 5000)
  })

rabbit.on('connected', () => {
  console.log('RabbitMQ connected')
})
rabbit.on('failed', () => {
  console.log('Connection to RabbitMQ was lost ...')
})

rabbit.on('unreachable', () => {
  console.log('RabbitMQ is unreachable')
  setTimeout(() => { process.exit(5) }, 5000)
})
