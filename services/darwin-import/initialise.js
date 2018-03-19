const amqp = require('amqplib/callback_api');
const assert = require('assert');
const zlib = require('zlib');
const XmlStream = require('xml-stream');
const { Readable } = require('stream');
const LineByLineReader = require('line-by-line')
const Measured = require('measured')
const moment = require('moment');
const DownloadManager = require('./lib/download-manager');
const DarwinMessageRouter = require('./lib/router');
var stats = Measured.createCollection();
var es = require('event-stream');
var fs = require('fs');
var nconf = require('nconf');
const ftpClient = require('ftp');

// status

stats.counter("schedule").reset();
stats.counter("ts").reset();
stats.counter('locationRef').reset();
stats.counter('tocRef').reset();
stats.counter('lateRunningReason').reset();
stats.counter('cancellationReason').reset();
stats.counter('viaRef').reset();
stats.counter('cisSourceRef').reset();
stats.counter('stationMessage').reset();
stats.counter("XMLParsed").reset();
stats.meter("messageRate").reset();

nconf.argv()
	.env()
	.file({
		file: '../config/config.json'
	});

nconf.required([
	"darwin:ftp",
	"darwin:ftp:host",
	"darwin:ftp:user",
	"darwin:ftp:password",
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

var messages = [];
function logMessage(message)
{
	messages.push(message);
}

function showMessages()
{
	var windowMessages = messages.slice(Math.max(messages.length - 10, 1))
	windowMessages.forEach(function (msg) {
		console.log("\t" + msg);
	});
}

// take a stream of Darwin PushPort XML, parse to JSON and route to an AMQP queue

function loadReference(list, dm, router)
{
	const path = ''
	return new Promise( function (resolve, reject) {
		list.forEach(function (file) {
			if (! file.name.match(/.+_ref_v3\.xml\.gz/) )
				return;
			dm.enqueueDownload( path, file, function (err, stream) {
				logMessage("Processing reference " + file.name)
				if (err)
				{
					reject(err);
					return;
				}

				var gunzip = zlib.createGunzip();
				router.routeDarwinMessagesFromStream(gunzip).then(function () {
					logMessage("Reference completed from " + file.name)
					resolve();
				});
			});
		});
	});
}

// download the schedule and reference dataset and send it somewhere.
function loadTimetable(list, dm, router)
{
	const path = ''
	return new Promise( function (resolve, reject) {
		list.forEach(function (file) {
			if (! file.name.match(/.*_v8\.xml\.gz/) )
				return;
			dm.enqueueDownload( path, file, function (err, stream) {
				logMessage("Processing timetable " + file.name)
				if (err)
				{
					reject(err);
					return;
				}
				var gunzip = zlib.createGunzip();
				stream.pipe(gunzip);
				router.routeDarwinMessagesFromStream(gunzip).then(function () {
						logMessage("Timetable successfully loaded from " + file.name)
						resolve();
				});
			});
		});
	});
}

// load the snapshot file and
function loadSnapshot(list, dm, router)
{
	const path = 'snapshot/'
	return new Promise( function (resolve, reject) {
		list.forEach(function (file) {
			dm.enqueueDownload( path, file,  function (err, stream) {
				logMessage("Processing snapshot " + file.name)
				if (err)
				{
					reject(err);
					return;
				}
				var gunzip = zlib.createGunzip();
				stream.pipe(gunzip);
				router.routeDarwinMessagesFromStream(gunzip).then(function () {
						logMessage("Snapshot successfully loaded from " + file.name)
						resolve();
				});
			});
		});
	})
}


function loadLogs(list, dm, router)
{
	const path = ''
	return new Promise( function (resolve, reject) {
		list.forEach(function (file) {
			if (! file.name.match( /^pPortData\.log\..+$/ ) )
				return
			dm.enqueueDownload( path, file, function (err, stream) {
				logMessage("Processing log " + file.name)
				if (err)
				{
					reject(err);
					return;
				}
				// the log files are line delimited XML files, so we have to split them up by line
				// and then to use the XML stream based parser we use normally, we have to turn each line into it's own stream.
				var lr = new LineByLineReader(stream);
				lr.on('line', function (line) {
					//console.log(line)
					var rs = new Readable();
					rs.push(line);
					rs.push(null);
					router.routeDarwinMessagesFromStream(rs);
				});

				lr.on('end', function () {
					logMessage("Push port logs successfully replayed from " + file.name)
					resolve();
				});
				lr.on('error', function (err) {
					logMessage("Error processing push port log " + err);
					// 'err' contains error object
				});
			});
		});
	})
}

/* Download the snapshot file from FTP and emit all the messages over the correct queues */
var dm;
var router;
var finished = false;
amqp.connect(nconf.get('amqp:uri'), function(err, conn) {
	if (err != null) {
		console.error(err);
		process.exit(1);
	}
	logMessage("Connected to AMQP");
	conn.createChannel(function(err, channel) {

		if (err != null) {
			logMessage(err);
			process.exit(1);
		}
		var routes = nconf.get("darwin:routes")
		// assert all of the exchanges first
		for (var i = 0; i < Object.keys(routes).length; i++) {
			var route = routes[Object.keys(routes)[i]];
			channel.assertExchange(route.exchange.destination, route.exchange.type, {
				durable: false
			});
		}
		var ftp = new ftpClient();
		ftp.on('ready', function (){
			logMessage("Connected to " + nconf.get("darwin:ftp:host"))
			ftp.list( function(err, topLevel) {
				logMessage("Listing files");
				topLevel.sort(function(a,b){
					return b.date - a.date;
				});
				ftp.list( 'snapshot', function (err, snapshotLevel) {
					logMessage("Listing snapshots");
					dm = new DownloadManager(ftp);
					router = new DarwinMessageRouter(channel, stats, routes);
					Promise.all([
						//loadLogs(topLevel, dm, router),
						//loadSnapshot(snapshotLevel, dm, router),
						loadTimetable(topLevel, dm, router),
						//loadReference(topLevel, dm, router)
					]).then(function() {
						logMessage("Completed loading References");
					});
					dm.on('done', function () {
						ftp.end();
						conn.close();
						//console.log(JSON.stringify(stats.toJSON(), null, 2))
						logMessage("Finished?");
						finished = true;
					});
					dm.on('itemcomplete', function (item) {
						logMessage("Item finished downloading " + item.path)
					});
					dm.runQueue();
				});
			});
		});
		ftp.connect({
			host: nconf.get('darwin:ftp:host'),
			user: nconf.get('darwin:ftp:user'),
			password: nconf.get('darwin:ftp:password'),
			secure: false
		});
	});
});

setInterval(function () {

	process.stdout.write('\033c');
	if (dm)
	{
		dm.displayStats();
	}
	showMessages();
	console.log('-----------------------')
	if (router)
	{
		console.log(router.getStats());
	}

	if (finished)
	{
		process.exit(0);
	}
},1000)
