const mqtt = require('mqtt')
const client = mqtt.connect(`mqtt://${process.env['MQTT_HOST']}:1883`)
const redis = require("redis")
const redisClient = redis.createClient({
    host: process.env['REDIS_HOST']
})

const sop = require('./reference/sop.js')
client.on('connect', () => {
    client.subscribe('TD_SUSS_SIG_AREA', function (err) {
        if (!err) {
            console.log('Subscribed OK!')
        }
    })
})
redisClient.on('connect', () => {
    console.log("Conected to redis")
})

function signalUpdate(message) {
    const messageTime = new Date(parseInt(message.time))
    if (sop[message.area_id]) {
        
        // convert the address into a integer (it's a hex string)
        const address = parseInt(message.address, 16)
        if (sop[message.area_id][address] === undefined) {
            console.log(`No SOP entry for address ${address} in ${message.area_id}`)
            return
        }
        const data = parseInt(message.data, 16)
        /*console.log({
            time: messageTime,
            area: message.area_id,
            address: address,
            data: data
        })*/
        // go through each bit and log the status of each signal
        var redisMultiCommand = redisClient.multi()
        for (var i = 0; i < 8; i++) {
            const index = 0x1 << i
            const value = (index & data) > 0
            const signal = sop[message.area_id][address][i]
            if (signal === "") {
                continue;
            }
            const status = (value > 0) ? "ON" : "OFF"
            redisMultiCommand = redisMultiCommand
                .set(`status.${message.area_id}.${signal}`, status)
                .set(`lastUpdate.${message.area_id}.${signal}`, messageTime)
                .publish(`${message.area_id}.${signal}`, status)
            console.log(`${messageTime} ${message.area_id} - ${signal} is ${status}`)
        }
        redisMultiCommand.exec()

    } else {
        //console.log(`No SOP entry for area ${message.area_id}`)
    }

}

client.on('message', function (topic, message) {
    // message is Buffer
    var TDmessages = JSON.parse(message.toString())
    TDmessages.forEach((message) => {
        const messageType = Object.keys(message)[0]
        switch (messageType) {
            case 'SF_MSG':
                //console.log("Signalling Update")
                signalUpdate(message[messageType])
                break;
            case 'SG_MSG':
                //console.log("Signalling Refresh")
                break;
            case 'SH_MSG':
                //console.log("Signalling Refresh Finished")
                break;
            default:
            //console.log(`Ignoring ${messageType}`)
        }
    })
})