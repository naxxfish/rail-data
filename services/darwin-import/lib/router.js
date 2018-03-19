const XmlStream = require('xml-stream');
const libxmljs = require("libxmljs");
class DarwinMessageRouter {
	constructor(amqchannel, stats, routes)
	{
		this.channel = amqchannel;
		this.routes = routes;
		this.stats = stats;
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
	}

	getStats()
	{
		return this.stats.toJSON();
	}

	reformatSchedule(scheduleXML)
	{
		var schedule = scheduleXML.$;
		var callingPoints = [];
		function flattenCallingPoints(type, cp)
		{
			var flatCP = cp.$;
			flatCP.type = type;
			callingPoints.push(flatCP);
		}
		if (scheduleXML.OR)
			scheduleXML.OR.forEach(function (cp) { flattenCallingPoints("OR",cp)});
		if (scheduleXML.PP)
			scheduleXML.PP.forEach(function (cp) { flattenCallingPoints("PP",cp)});
		if (scheduleXML.DT)
			scheduleXML.DT.forEach(function (cp) { flattenCallingPoints("DT",cp)});
		if (scheduleXML.IP)
			scheduleXML.IP.forEach(function (cp) { flattenCallingPoints("IP",cp)});

		return schedule;
	}



	routeDarwinMessagesFromStream(stream)
	{
		function attrsToKeys(attrs)
		{
			var obj = {}
			for (var i=0;i<attrs.length;i++)
			{
				var attr = attrs[i];
				if (attr.length == 4)
				{
					var key = attr[0];
					var value = attr[3];
					obj[attr[0]] = attr[3];
				}

			}
			return obj;
		}
		var self = this;
		var routes = self.routes;
		return new Promise(function (resolve, reject) {
			var parser = new libxmljs.SaxPushParser();
			stream.on('data', function (chunk) {
				parser.push(chunk.toString('utf-8'));
			});
			stream.on('error', function (err) {
				reject(err)
			})
			parser.on('startDocument', function() {
//				console.log("document started")
			});
			parser.on('error', function (err) {
				reject(err);
			})
			parser.on('warning', function (warn)
			{
				console.error(warn);
			})
			parser.on('startDocument', function() {
				console.log("start document")
			})
			parser.on('endDocument', function() {
				console.log("ended document")
			})
			var currentSchedule = {}
			currentSchedule.callingPoints = []
			parser.on('startElementNS', function (elem, attrs, prefix, uri, namespace){

				//console.log(elem, attrs, prefix, uri, namespace)
				//console.log("start: ", elem)
				switch(elem)
				{
					case 'schedule':
					case 'Journey':
						currentSchedule = attrsToKeys(attrs);
						currentSchedule.callingPoints = []
						break;
					case 'OR':
					case 'PP':
					case 'IP':
					case 'OPIP':
					case 'DT':
						var callingPoint = {}
						callingPoint = attrsToKeys(attrs);
						callingPoint.locationType =  elem;
						currentSchedule.callingPoints.push(callingPoint);
						break;
				}

			});
			parser.on('endElementNS', function (elem, prefix, uri) {
				//console.log("End: ", elem);
				switch (elem)
				{
					case 'schedule':
					case 'Journey':
					//console.log("Finished Journey ", currentSchedule)
					if (routes.schedule)
					{
						self.stats.counter("schedule").inc();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.schedule.exchange.destination,
							routes.schedule.exchange.routingKey,
							new Buffer( JSON.stringify(currentSchedule) )
						);
					}
					break;
				}

			});
			/*stream.on('end', function () {
				var routes = self.routes;
				console.log(JSON.stringify(xmlDoc.toString()));

				if (routes.schedule)
				{
					xml.on('startElement: schedule', function() {
						xml.on('endElement: OR', function (element) {
							console.log("Calling point ", element)
						})
					})

					xml.on('endElement: schedule', function(scheduleXML) {
						//console.log("schedule")
						self.stats.counter("schedule").inc();
						self.stats.meter("messageRate").mark();
						var schedule = self.reformatSchedule(scheduleXML);
						self.channel.publish(
							routes.schedule.exchange.destination,
							routes.schedule.exchange.routingKey,
							new Buffer( JSON.stringify(schedule) )
						);
					});
					xml.on('startElement: Journey', function() {
						xml.on('endElement: OR', function (element) {
							console.log("Calling point ", element)
						})
					})
					xml.on('endElement: Journey', function(scheduleXML) {
						//console.log("schedule")
						self.stats.counter("schedule").inc();
						self.stats.meter("messageRate").mark();
						var schedule = self.reformatSchedule(scheduleXML);
						self.channel.publish(
							routes.schedule.exchange.destination,
							routes.schedule.exchange.routingKey,
							new Buffer( JSON.stringify(schedule) )
						);
					});
				}
				if (routes.ts)
				{
					xml.on('endElement: TS', function(ts) {
						self.stats.counter("ts").inc();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.ts.exchange.destination,
							routes.ts.exchange.routingKey,
							new Buffer( JSON.stringify(ts) )
						);
					});
				}
				if (routes.reference)
				{
					xml.on('endElement: LocationRef', function (location) {
						self.stats.counter('locationRef').inc();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.reference.exchange.destination,
							routes.reference.exchange.routingKey,
							new Buffer( JSON.stringify(location) )
						);
					});
					xml.on('endElement: TocRef', function (tocref) {
						self.stats.counter('tocRef').mark();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.reference.exchange.destination,
							routes.reference.exchange.routingKey,
							new Buffer( JSON.stringify(tocref) )
						);
					});

					xml.on('endElement: LateRunningReasons > Reason', function (reason) {
						self.stats.counter('lateRunningReason').inc();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.reference.exchange.destination,
							routes.reference.exchange.routingKey,
							new Buffer( JSON.stringify(reason) )
						);
					});
					xml.on('endElement: CancellationReasons > Reason', function (reason) {
						self.stats.counter('cancellationReason').inc();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.reference.exchange.destination,
							routes.reference.exchange.routingKey,
							new Buffer( JSON.stringify(reason) )
						);
					});
					xml.on('endElement: Via', function (via) {
						self.stats.counter('viaRef').inc();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.reference.exchange.destination,
							routes.reference.exchange.routingKey,
							new Buffer( JSON.stringify(via) )
						);
					});
					xml.on('endElement: CISSource', function (source) {
						self.stats.counter('cisSourceRef').inc();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.reference.exchange.destination,
							routes.reference.exchange.routingKey,
							new Buffer( JSON.stringify(source) )
						);
					})
				}
				if (routes.ow)
				{
					xml.on('endElement: OW', function(ow) {
						self.stats.counter('stationMessage').inc();
						self.stats.meter("messageRate").mark();
						self.channel.publish(
							routes.ow.exchange.destination,
							routes.ow.routingKey,
							new Buffer( JSON.stringify(ow) )
						);
					});
				}
			})*/
		});
	}
}

module.exports = DarwinMessageRouter;
