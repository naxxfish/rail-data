const mqtt = require('mqtt')
const mqttClient = mqtt.connect(`mqtt://${process.env['MQTT_HOST']}:1883`)
const redis = require("redis")
const redisClient = redis.createClient({
  host: process.env['REDIS_HOST']
})
const SClassProcessor = require('./lib/SClassProcessor')

mqttClient.on('connect', () => {
  // maybe subscribe to any TD topics ..
  mqttClient.subscribe('TD_SUSS_SIG_AREA', function (err) {
    if (!err) {
      console.log('Subscribed OK!')
    }
  })
})
redisClient.on('connect', () => {
  console.log('Conected to redis')
})

mqttClient.on('message', function (topic, message) {
  var TDmessages = JSON.parse(message.toString())
  TDmessages.forEach((message) => {
    SClassProcessor.handleSClassMessage(message, redisClient)
  })
})
