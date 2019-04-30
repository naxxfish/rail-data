const sop = require('../reference/sop.js')
const logger = require('./log')

var messagesProcessed = 0

exports.parseMessage = function hangleSClassMessage (message, redisClient) {
  const messageType = message.msg_type
  switch (messageType) {
    case 'SF':
      singleSignalUpdate(message, redisClient)
      logger.log('debug',
        { 'td_action': 'signal_update',
          'area_id': message.area_id
        })
      break
    case 'SG':
      signalRefresh(message, redisClient)
      logger.log('debug',
        { 'td_action': 'signal_refresh',
          'area_id': message.area_id
        })
      break
    case 'SH':
      signalRefresh(message, redisClient)
      logger.log('debug',
        { 'td_action': 'signal_refresh_finished',
          'area_id': message.area_id
        })
      break
    default:
      logger.log('error', `unknown S class message! ${messageType}`)
  }
  messagesProcessed++
  if ((messagesProcessed % 1000) === 0) {
    logger.log('info', `Processed ${messagesProcessed} S-class messages`)
  }
}

function applySignalUpdate (areaId, signalId, status, messageTime, redisClient) {
  const signalPubsubTopic = `signal.${areaId}.${signalId}`
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
        .ltrim(historySignalKey, 0, 199)
        .publish(signalPubsubTopic, JSON.stringify({ status: status, area_id: areaId, signal: signalId }))
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

function singleSignalUpdate (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  const signals = decodeSignalStates(message.area_id, message.address, message.data)
  signals.forEach((signal) => {
    applySignalUpdate(message.area_id, signal.signalId, signal.status, messageTime, redisClient)
  })
}

function signalRefresh (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  const startAddress = parseInt(message.address, 16)
  logger.log('info', `${message.area_id} refresh starting at address ${message.address} with data ${message.data}`)
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
