function getBerth (redisClient, areaId, berthId, res, next) {
  redisClient.mget([
    `berth.${areaId}.${berthId}`
  ], (err, [ descr ]) => {
    if (err) {
      res.send({ 'error': err })
      res.status(500)
      next()
      return
    }
    if (descr === null) {
      res.status(404)
      res.send({
        'error': 'signal not found'
      })
      next()
      return
    }
    res.send({
      'berth': berthId,
      'area_id': areaId,
      'descr': descr
    })
    next()
  })
}

module.exports = {
  getBerth
}
