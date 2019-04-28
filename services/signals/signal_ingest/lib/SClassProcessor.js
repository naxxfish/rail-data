const sop = require('../reference/sop.js')

function hangleSClassMessage (message, redisClient) {
  const messageType = Object.keys(message)[0]
  switch (messageType) {
    case 'SF_MSG':
      signalUpdate(message[messageType], redisClient)
      break
    case 'SG_MSG':
      signalRefresh(message[messageType], redisClient)
      console.log('Start Signalling Refresh')
      break
    case 'SH_MSG':
      signalRefresh(message[messageType], redisClient)
      console.log('Signalling Refresh Finished')
      break
  }
}

function applySignalUpdate (areaId, signalId, status, messageTime, redisClient) {
  const statusSignalKey = `status.${areaId}.${signalId}`
  const lastUpdateSignalKey = `lastUpdate.${areaId}.${signalId}`
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
      console.log(`[${messageTime.toISOString()}] ${areaId} - ${signalId} changed to ${status}`)
    }
  })
}

function decodeSignalStates (areaId, rawAddress, rawData) {
  var signals = []
  if (sop[areaId]) {
    // convert the address into a integer (it's a hex string)
    const address = parseInt(rawAddress, 16)
    if (sop[areaId][address] === undefined) {
      console.log(`No SOP entry for address ${address} in ${areaId}`)
    } else {
      const data = parseInt(rawData, 16)
      for (var i = 0; i < 8; i++) {
        const index = 0x1 << i
        const value = (index & data) > 0
        const signalId = sop[areaId][address][i]
        if (signalId === '') {
          continue
        }
        const status = (value > 0) ? 'ON' : 'OFF'
        signals.push({
          signalId,
          status
        })
      }
    }
  }
  return signals
}

function signalUpdate (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  const signals = decodeSignalStates(message.area_id, message.address, message.data)
  signals.forEach((signal) => {
    applySignalUpdate(message.area_id, signal.signalId, signal.status, messageTime, redisClient)
  })
}

function signalRefresh (message, redisClient) {
  // {"SG_MSG":{"time":"1422404915000","area_id":"RW","address":"00","msg_type":"SG","data":"06880306"}}
  const messageTime = new Date(parseInt(message.time))
  const startAddress = parseInt(message.address, 16)
  // SG/H messages contain 4 bytes
  for (var i = 0; i < 8; i += 2) {
    const data = parseInt(message.data.substring(i, i + 2), 16)
    const address = startAddress + (i / 2)
    console.log(i, data, address)
    const signals = decodeSignalStates(message.area_id, address, data)
    console.log(signals)
    signals.forEach((signal) => {
      applySignalUpdate(message.area_id, signal.signalId, signal.status, messageTime, redisClient)
    })
  }
}

module.exports = {
  handleSClassMessage: hangleSClassMessage
}
