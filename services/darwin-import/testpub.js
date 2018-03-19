var stompit = require('stompit');
var nconf = require('nconf');
var fs = require('fs');
var amqp = require('amqplib/callback_api');
nconf.argv()
 .env()
 .file({ file: 'config/defaults.json' });

nconf.required([
	"stomp:host",
	"routes"
]);
if (nconf.get('redis'))
{
	require('nconf-redis');
	nconf.use('redis', { host: nconf.get('redis:host'), port: nconf.get('redis:port')});
}

function sendJSONFile(client, destination, filename)
{
	return new Promise(function (resolve, reject) {
		var sendHeaders = {
		  'destination': destination,
		  'content-type': 'application/json'
		};

		var frame = client.send(sendHeaders, {
			onReceipt: function () {
				resolve();
			}
		});
		frame.write(fs.readFileSync(filename, 'utf-8'));
		frame.end();
	});
}

stompit.connect(nconf.get('stomp'), function (err, client) {
	if (err)
	{
		console.error(err);
		process.exit(1);
		return;
	}
	Promise.all([
		sendJSONFile(client,'/topic/VSTP_ALL','test/fixtures/vstp_test.json'),
		sendJSONFile(client,'/topic/TRAIN_MVT_HU_TOC','test/fixtures/trust_test.json'),
		sendJSONFile(client,'/topic/TRAIN_MVT_HU_TOC','test/fixtures/trust_test.json'),
		sendJSONFile(client,'/topic/VSTP_ALL','test/fixtures/vstp_test.json'),
		sendJSONFile(client,'/topic/VSTP_ALL','test/fixtures/vstp_test.json'),
		sendJSONFile(client,'/topic/TRAIN_MVT_HU_TOC','test/fixtures/trust_test.json'),
		sendJSONFile(client,'/topic/TRAIN_MVT_HU_TOC','test/fixtures/trust_test.json'),
		sendJSONFile(client,'/topic/VSTP_ALL','test/fixtures/vstp_test.json'),
		sendJSONFile(client,'/topic/VSTP_ALL','test/fixtures/vstp_test.json'),
		sendJSONFile(client,'/topic/TRAIN_MVT_HU_TOC','test/fixtures/trust_test.json'),
		sendJSONFile(client,'/topic/TRAIN_MVT_HU_TOC','test/fixtures/trust_test.json'),
		sendJSONFile(client,'/topic/VSTP_ALL','test/fixtures/vstp_test.json'),
		sendJSONFile(client,'/topic/VSTP_ALL','test/fixtures/vstp_test.json'),
		sendJSONFile(client,'/topic/TRAIN_MVT_HU_TOC','test/fixtures/trust_test.json'),
		sendJSONFile(client,'/topic/TRAIN_MVT_HU_TOC','test/fixtures/trust_test.json'),
		sendJSONFile(client,'/topic/VSTP_ALL','test/fixtures/vstp_test.json')
	]).then( function () {
		console.log("Sent several messages");
		client.disconnect();
	})
});
