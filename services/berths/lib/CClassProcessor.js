const BerthStepReference = require('./BerthStepReference')

var messagesProcessed = 0

async function berthStep (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  const toBerthKey = `berth.${message.area_id}.${message.to}`
  const fromBerthKey = `berth.${message.area_id}.${message.from}`
  const trainDescription = message.descr
  var smartReferenceLookup = null
  try {
    smartReferenceLookup = await BerthStepReference.getBerthStep(message.area_id, message.from, message.to)
  } catch (e) {
    console.error(e)
  }
  redisClient.multi()
    .set(toBerthKey, trainDescription)
    .set(fromBerthKey, '')
    .publish(toBerthKey, trainDescription)
    .exec()
  messagesProcessed++
  if ((messagesProcessed % 10) === 0) {
    console.log(`[${messageTime.toISOString()}] Processed ${messagesProcessed} C-class messages`)
  }
  // HACKHACKHACK
  if (smartReferenceLookup !== null && smartReferenceLookup.locations.stanme === 'ELTHAM') {
    console.log(`[${messageTime.toISOString()}] [${message.area_id}] Berth Step from ${message.from} to ${message.to} by ${message.descr}`)
    console.log(smartReferenceLookup)
    console.log('\x07')
  }
}
function berthInterpose (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  const toBerthKey = `berth.${message.area_id}.${message.to}`
  const trainDescription = message.descr
  redisClient.multi()
    .set(toBerthKey, trainDescription)
    .publish(toBerthKey, trainDescription)
    .exec()
  console.log(`[${messageTime.toISOString()}] [${message.area_id}]Berth Interpose to ${message.to} by ${message.descr}`)
}

function berthCancel (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  const fromBerthKey = `berth.${message.area_id}.${message.from}`
  redisClient.multi()
    .set(fromBerthKey, '')
    .exec()
  console.log(`[${messageTime.toISOString()}] [${message.area_id}] Berth Cancel ${message.descr} from ${message.from}`)
}

function tdHeartbeat (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  console.log(`[${messageTime.toISOString()}] TD heartbeat from ${message.area_id}, reporting at ${message.report_time}`)
}

module.exports = {
  parseMessage: function (message, redisClient) {
    const messageType = Object.keys(message)[0]
    switch (messageType) {
      case 'CA_MSG':
        // console.log("Berth Step")
        berthStep(message[messageType], redisClient)
        break
      case 'CB_MSG':
        // console.log("Berth Cancel")
        berthCancel(message[messageType], redisClient)
        break
      case 'CC_MSG':
        // console.log("Berth Interpose")
        berthInterpose(message[messageType], redisClient)
        break
      case 'CT_MSG':
        // console.log("heartbeat", message)
        tdHeartbeat(message[messageType], redisClient)
    }
  }
}
