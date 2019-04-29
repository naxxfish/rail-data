const berthController = require('../controllers/berths')

module.exports = function (server, redisClient) {
  server.get('/td/berth/:areaId/:berthId', (req, res, next) => {
    berthController.getBerth(redisClient, req.params.areaId, req.params.berthId, res, next)
  })
}
