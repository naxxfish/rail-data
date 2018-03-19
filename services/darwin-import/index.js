const stompit = require('stompit');
const amqp = require('amqplib/callback_api');
const assert = require('assert');
const zlib = require('zlib');
const XmlStream = require('xml-stream');
const DarwinMessageRouter = require('./lib/router');
var stats = require('measured').createCollection();
var fs = require('fs');
var nconf = require('nconf');

var router = null;

nconf.argv()
	.env()
	.file({
		file: '../config/config.json'
	});

nconf.required([
	"darwin:stomp:host",
	"darwin:queueName",
	"darwin:routes",
	"amqp:uri"
]);

if (nconf.get('redis')) {
	require('nconf-redis');
	nconf.use('redis', {
		host: nconf.get('redis:host'),
		port: nconf.get('redis:port')
	});
}

function logMessage(msg)
{
	console.log(msg);
}

amqp.connect(nconf.get('amqp:uri'), function(err, conn) {
	if (err != null) {
		console.error(err);
		process.exit(1);
	}
	console.log("Connected to AMQP");
	conn.createChannel(function(err, channel) {
		if (err != null) {
			console.error(err);
			process.exit(1);
		}
		stompit.connect(nconf.get('darwin:stomp'), function(err, stompClient) {
			console.log("Connected to STOMP");
			if (err) {
				console.error(err);
				process.exit(1);
				return;
			}

			function exitHandler(err) {
				console.error(err);
				stompClient.disconnect();
				console.log('Disconnected');
				process.exit();
			}
			//process.on('SIGINT', exitHandler.bind(null, {}));

			var routes = nconf.get('darwin:routes');
			router = new DarwinMessageRouter(channel, stats, routes);
			// assert all of the exchanges first
			for (var i = 0; i < Object.keys(routes).length; i++) {
				var route = routes[Object.keys(routes)[i]];
				channel.assertExchange(route.exchange.destination, route.exchange.type, {
					durable: false
				});
			}

			var subscribeParams = {
				"destination": nconf.get("darwin:queueName"),
				"ack": "client-individual"
			}

			stompClient.subscribe(subscribeParams, function(error, message) {
				stats.meter('recieved').mark();
				if (error) {
					console.error(error);
				}
				var gunzip = zlib.createGunzip();
				message.pipe(gunzip);

				router.routeDarwinMessagesFromStream(gunzip, channel, nconf.get('darwin:routes')).then(function() {
					stats.meter('acked').mark();
					stompClient.ack(message);
					//console.log("Routed OK")
				}).catch(function(err) {
					console.error("An error occurred! " + err)
				});
			});
		});
	});
});
const rate = 5000;
setInterval(function() {
	if (router)
	{
		console.log(router.getStats())
	}
}, rate)
