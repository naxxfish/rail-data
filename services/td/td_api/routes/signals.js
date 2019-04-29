const signalController = require('../controllers/signals')

module.exports = function (server, redisClient) {
  server.get('/td/signal/status/:areaId/:signalId', (req, res, next) => {
    signalController.getSignal(redisClient, req.params.areaId, req.params.signalId, res, next)
  })
  server.get('/td/signal/history/:areaId/:signalId', (req, res, next) => {
    signalController.getSignalHistory(redisClient, req.params.areaId, req.params.signalId, res, next)
  })
}
