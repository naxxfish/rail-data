$(function () {
  var socket = io({
    path: '/td/websocket'
  })
  socket.on('connect', function () {
    socket.emit('room', 'signal.VC.TRSV1')
    socket.emit('room', 'signal.VC.TRSV2')
    socket.emit('room', 'signal.VC.TRSV3')
    socket.emit('room', 'signal.VC.TRSV4')
    socket.emit('room', 'signal.VC.TRSV5')
    socket.emit('room', 'signal.VC.TRSV6')
    socket.emit('room', 'signal.VC.TRSV7')
    socket.emit('room', 'signal.VC.TRSV8')
    socket.emit('room', 'signal.VC.TRSV9')
    socket.emit('room', 'signal.VC.TRSV10')
    socket.emit('room', 'signal.VC.TRSV11')
    socket.emit('room', 'signal.VC.TRSV12')
    //socket.emit('room', 'clock')
    socket.emit('room', 'berth.VC.F003')
    socket.emit('room', 'berth.VC.R003')
    socket.emit('room', 'berth.VC.F007')
    socket.emit('room', 'berth.VC.F009')
    socket.emit('room', 'berth.VC.F011')
    socket.emit('room', 'berth.VC.F013')
    socket.emit('room', 'berth.VC.F015')
    socket.emit('room', 'berth.VC.F017')
    console.log('joined some rooms')
  })
  socket.on('signal', function (msg) {
    console.log(msg)
  })
  socket.on('berth', function (msg) {
    console.log(msg)
  })
  socket.on('time', function (clock) {
    console.log('clock', clock)
  })
})
