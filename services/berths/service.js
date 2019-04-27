const mqtt = require('mqtt')
const client = mqtt.connect(`mqtt://${process.env['MQTT_HOST']}:1883`)
const redis = require('redis')
const redisClient = redis.createClient({
  host: process.env['REDIS_HOST']
})
const CClassProcessor = require('./lib/CClassProcessor')

client.on('connect', () => {
  client.subscribe('TD_ALL_SIG_AREA', function (err) {
    if (!err) {
      console.log('Subscribed OK!')
    }
  })
})
redisClient.on('connect', () => {
  console.log('Conected to redis')
})

client.on('message', function (topic, message) {
  // message is Buffer
  var TDmessages = JSON.parse(message.toString())
  TDmessages.forEach((message) => {
    CClassProcessor.parseMessage(message, redisClient)
  })
})
