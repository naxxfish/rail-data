const mqtt = require('mqtt')
const mqttClient = mqtt.connect(`mqtt://${process.env['MQTT_HOST']}:1883`, {
  username: process.env['MQTT_USERNAME'],
  password: process.env['MQTT_PASSWORD']
})

const redis = require('redis')

const redisClient = redis.createClient({
  host: process.env['REDIS_HOST']
})
const SClassProcessor = require('./lib/SClassProcessor')

mqttClient.on('connect', () => {
  // maybe subscribe to any TD topics ..
  mqttClient.subscribe('td', function (err) {
    if (!err) {
      console.log('Subscribed OK!')
    } else {
      console.log('Error connecting to MQTT ' + err)
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
