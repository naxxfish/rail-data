const sop = require('../reference/sop.js')
const logger = require('../log.js')

function hangleSClassMessage (message, redisClient) {
  const messageType = Object.keys(message)[0]
  switch (messageType) {
    case 'SF_MSG':
      signalUpdate(message[messageType], redisClient)
      break
    case 'SG_MSG':
      signalRefresh(message[messageType], redisClient)
      logger.log('debug',
        { 'action': 'signal_refresh',
          'area_id': message[messageType].area_id
        })
      break
    case 'SH_MSG':
      signalRefresh(message[messageType], redisClient)
      logger.log('debug',
        { 'action': 'signal_refresh_finished',
          'area_id': message[messageType].area_id
        })
      break
  }
}

function applySignalUpdate (areaId, signalId, status, messageTime, redisClient) {
  const statusSignalKey = `signal.${areaId}.${signalId}.status`
  const lastUpdateSignalKey = `signal.${areaId}.${signalId}.lastUpdate`
  const historySignalKey = `signal.${areaId}.${signalId}.history`
  redisClient.get(statusSignalKey, (err, currentValue) => {
    if (err) {
      logger.log('error', `Redis error getting existing value ${err}`)
    }
    if (currentValue !== status) {
      redisClient.multi()
        .set(statusSignalKey, status)
        .set(lastUpdateSignalKey, messageTime.toISOString())
        .lpush(historySignalKey, JSON.stringify({
          from: currentValue,
          to: status,
          time: messageTime.toISOString()
        }))
        .publish(statusSignalKey, status)
        .exec()
      logger.log('debug',
        { 'action': 'changed',
          'area_id': areaId,
          'signal_id': signalId,
          'status': status,
          'statusRedisKey': statusSignalKey,
          'lastUpdateSignalRedisKey': lastUpdateSignalKey,
          'historySignalRedisKey': historySignalKey
        })
    }
  })
}

function decodeSignalStates (areaId, rawAddress, rawData) {
  var signals = []
  if (sop[areaId]) {
    // convert the address into a integer (it's a hex string)
    const address = parseInt(rawAddress, 16)
    if (sop[areaId][address] === undefined) {
      logger.log('debug', `No SOP entry for address ${address} in ${areaId}`)
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
  logger.log('debug', `${message.area_id} refresh starting at address ${message.address} with data ${message.data}`)
  // SG/H messages contain 4 bytes
  for (var i = 0; i < 8; i += 2) {
    const data = parseInt(message.data.substring(i, i + 2), 16)
    const address = startAddress + (i / 2)
    logger.log('silly', { i, data, address })
    const signals = decodeSignalStates(message.area_id, address, data)
    logger.log('silly', { signals: signals })
    signals.forEach((signal) => {
      applySignalUpdate(message.area_id, signal.signalId, signal.status, messageTime, redisClient)
    })
  }
}

module.exports = {
  handleSClassMessage: hangleSClassMessage
}
