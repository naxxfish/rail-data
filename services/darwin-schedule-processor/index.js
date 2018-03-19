const amqp = require('amqplib/callback_api');
const assert = require('assert');
var nconf = require('nconf');

nconf.argv()
	.env()
	.file({
		file: '../config/config.json'
	});

if (nconf.get('redis')) {
	require('nconf-redis');
	nconf.use('redis', {
		host: nconf.get('redis:host'),
		port: nconf.get('redis:port')
	});
}

nconf.required([
	"amqp:uri",
	"darwin:routes:schedule:exchange:destination",
	"darwin:routes:schedule:exchange:routingKey",
	"darwin:routes:schedule:exchange:type"

]);

function bail(err, connection) {
  console.error(err);
  if (connection) connection.close(function() { process.exit(1); });
}

amqp.connect( nconf.get('amqp:uri'), function (err, connection) {
	if (err !== null) return bail(err);
	console.log("Connected!")
	process.once('SIGINT', function() { connection.close(); });
	connection.createChannel(function (err, channel) {
		channel.assertExchange(nconf.get('darwin:routes:schedule:exchange:destination'), nconf.get('darwin:routes:schedule:exchange:type'), {durable: false});
		channel.assertQueue('', {exclusive: true}, function(err, ok) {
			if (err !== null) return bail(err, connection);
			var queue = ok.queue;
			channel.bindQueue(queue, nconf.get('darwin:routes:schedule:exchange:destination'), nconf.get('darwin:routes:schedule:exchange:routingKey'));
			channel.consume(queue, function (msg) {
				console.log("Got Message: ", msg.content.toString());
			}, {noAck: true});
		});
	});
});
