const sop = require('../reference/sop.js')

function handleSClassMessage (message, redisClient) {
  const messageType = Object.keys(message)[0]
  switch (messageType) {
    case 'SF_MSG':
      signalUpdate(message[messageType], redisClient)
      break
    case 'SG_MSG':
      // console.log("Signalling Refresh")
      break
    case 'SH_MSG':
      // console.log("Signalling Refresh Finished")
      break
  }
}

function signalUpdate (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  if (sop[message.area_id]) {
    // convert the address into a integer (it's a hex string)
    const address = parseInt(message.address, 16)
    if (sop[message.area_id][address] === undefined) {
      console.log(`No SOP entry for address ${address} in ${message.area_id}`)
      return
    }
    const data = parseInt(message.data, 16)
    for (var i = 0; i < 8; i++) {
      const index = 0x1 << i
      const value = (index & data) > 0
      const signal = sop[message.area_id][address][i]
      if (signal === '') {
        continue
      }
      const status = (value > 0) ? 'ON' : 'OFF'
      const statusSignalKey = `status.${message.area_id}.${signal}`
      const lastUpdateSignalKey = `lastUpdate.${message.area_id}.${signal}`
      redisClient.get(statusSignalKey, (err, currentValue) => {
        if (err) {
          console.log(`Redis error getting existing value ${err}`)
        }
        if (currentValue !== status) {
          redisClient.multi()
            .set(statusSignalKey, status)
            .set(lastUpdateSignalKey, messageTime.toISOString())
            .lpush(`history.${statusSignalKey}`, JSON.stringify({
              from: currentValue,
              to: status,
              time: messageTime.toISOString()
            }))
            .publish(statusSignalKey, status)
            .exec()
          console.log(`[${messageTime.toISOString()}] ${message.area_id} - ${signal} changed to ${status}`)
        }
      })
    }
  } else {
    // console.log(`No SOP entry for area ${message.area_id}`)
  }
}

module.exports = {
  handleSClassMessage
}
