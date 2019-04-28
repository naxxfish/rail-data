function getSignal (redisClient, areaId, signalId, res, next) {
  redisClient.mget([
    `status.${areaId}.${signalId}`,
    `lastUpdate.${areaId}.${signalId}`
  ], (err, [ status, lastUpdateTime ]) => {
    if (err) {
      res.send({ 'error': err })
      res.status(500)
      next()
      return
    }
    if (status === null) {
      res.status(404)
      res.send({
        'error': 'signal not found'
      })
      next()
      return
    }
    res.send({
      'status': status,
      'lastUpdateTime': lastUpdateTime
    })
    next()
  })
}

function getSignalHistory (redisClient, areaId, signalId, res, next) {
  redisClient.multi()
    .get(`signal.${areaId}.${signalId}.status`)
    .get(`signal.${areaId}.${signalId}.lastUpdate`)
    .lrange(`signal.${areaId}.${signalId}.history`, 0, -1)
    .exec((err, [ status, lastUpdateTime, history ]) => {
      if (err) {
        res.send({ 'error': err })
        res.status(500)
        next()
        return
      }
      if (status === null) {
        res.status(404)
        res.send({
          'error': 'signal not found'
        })
        next()
        return
      }
      console.log(`status: ${status} lastUpdateTime: ${lastUpdateTime} history: ${history}`)
      res.send({
        'status': status,
        'lastUpdateTime': lastUpdateTime,
        'history': history.map(x => JSON.parse(x))
      })
      next()
    })
}

module.exports = {
  getSignal,
  getSignalHistory
}
