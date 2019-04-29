// const BerthStepReference = require('./BerthStepReference')
const logger = require('./log')

var messagesProcessed = 0

exports.parseMessage = function handleSClassMessage (message, redisClient) {
  const messageType = message.msg_type
  switch (messageType) {
    case 'CA':
      berthStep(message, redisClient)
      logger.log('debug',
        { 'action': 'berth_step',
          'area_id': message.area_id
        })
      break
    case 'CB':
      berthCancel(message, redisClient)
      logger.log('debug',
        { 'action': 'berth_cancel',
          'area_id': message.area_id
        })
      break
    case 'CC':
      berthInterpose(message, redisClient)
      logger.log('debug',
        { 'action': 'berth_interpose',
          'area_id': message.area_id
        })
      break
    case 'CT':
      tdHeartbeat(message, redisClient)
      logger.log('debug',
        { 'action': 'berth_heartbeat',
          'area_id': message.area_id
        })
      break
    default:
      logger.log('error', `unknown C class message! ${messageType}`)
  }
  messagesProcessed++
  if ((messagesProcessed % 1000) === 0) {
    logger.log('info', `Processed ${messagesProcessed} C-class messages`)
  }
}

async function berthStep (message, redisClient) {
  const toBerthKey = `berth.${message.area_id}.${message.to}`
  const fromBerthKey = `berth.${message.area_id}.${message.from}`
  const trainDescription = message.descr
  redisClient.multi()
    .set(toBerthKey, trainDescription)
    .set(fromBerthKey, '')
    .publish(toBerthKey, trainDescription)
    .exec()
  logger.log('debug', {
    'action': 'step',
    'descr': message.descr,
    'from': message.from,
    'to': message.to,
    'redisFromKey': fromBerthKey,
    'redisToBerthKey': toBerthKey
  })
}

function berthInterpose (message, redisClient) {
  const toBerthKey = `berth.${message.area_id}.${message.to}`
  const trainDescription = message.descr
  redisClient.multi()
    .set(toBerthKey, trainDescription)
    .publish(toBerthKey, trainDescription)
    .exec()
  logger.log('debug', {
    'action': 'interpose',
    'descr': message.descr,
    'to': message.to,
    'redisToBerthKey': toBerthKey
  })
}

function berthCancel (message, redisClient) {
  const fromBerthKey = `berth.${message.area_id}.${message.from}`
  redisClient.multi()
    .set(fromBerthKey, '')
    .exec()
  logger.log('debug', {
    'action': 'cancel',
    'descr': message.descr,
    'from': message.from,
    'redisFromKey': fromBerthKey
  })
}

function tdHeartbeat (message, redisClient) {
  const messageTime = new Date(parseInt(message.time))
  redisClient.multi()
    .set(`td.${message.area_id}.lastReportTime`, message.report_time)
    .set(`td.${message.area_id}.lastHeartbeatTime`, messageTime.toISOString())
    .exec()
  logger.log('debug', {
    'action': 'heartbeat',
    'area': message.area_id,
    'report_time': message.report_time
  })
}
