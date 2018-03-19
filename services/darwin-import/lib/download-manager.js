"use strict";

const EventEmitter = require('events').EventEmitter;

function remove(array, element) {
	if (array.indexOf(element) > -1) {
		array.splice(array.indexOf(element), 1);
	}
}

class Downloader extends EventEmitter {
	constructor(ftp, path, file, callback)
	{
		super();
		this.path = path;
		this.ftp = ftp;
		this.file = file;
		this.path = path + file.name
		this.callback = callback;
		this.bytes = 0;
		this.running = false;
	}

	showStat()
	{
		var self = this;
		var status = "[ Q  ]"
		if (this.running)
		{
			status =  "[ DL ]"
		}
		console.log( status + ": " + self.path + " ( " + Math.round((self.bytes /  self.file.size)*100) + " % )" );
	}

	download()
	{
		var self = this;
		self.running = true;
		this.ftp.get(self.path, function (error, stream) {
			if (error)
			{
				self.emit('error', error);
				console.error(error)
				//self.emit('complete');
				return;
			}
			self.emit('started');
			stream.on('end', function() {
				self.emit('complete');
			});
			stream.on('data', function (data) {
				self.bytes += data.length;
			})
			self.callback(error, stream);
		});
	}
}
const displayLength = 20;
class DownloadManager extends EventEmitter
{

	constructor(ftp)
	{

		super();
		this.ftp = ftp;
		this.queue = [];
		this.current = undefined;
		this.inprogress = 0;
		this.complete = [];
		this.started = false;
	}

	enqueueDownload(path, file, callback)
	{
		this.queue.unshift(
			new Downloader(this.ftp, path, file, callback)
		)
	}

	displayStats()
	{
		var self = this;
		console.log("-----------------------------------")
		if (self.current)
		{
			self.current.showStat();
		}

		var counter = 0
		self.queue.forEach(function (download) {
			counter++
			if (counter == displayLength)
			{
				console.log("... and " + (self.queue.length - 5) + " more")
				return
			}
			if (counter > displayLength)
				return;
			download.showStat();
		});
		console.log("-----------------------------------")
	}

	runQueue()
	{
		var self = this;

		if (self.queue.length == 0)
		{
			if (self.started == false)
			{
				// nothing to run yet, try again in a moment
				setTimeout(function () { self.runQueue() },1000);
				return;
			}
			else {
				self.emit('done');
				return;
			}
		}
		self.started = true;
		var nextDownload = self.queue.shift();
		self.current = nextDownload;
		nextDownload.download();
		self.inprogress++;
		nextDownload.on('error', function (error) {
			self.emit('error', nextDownload.path + " : " + error)
			setTimeout(function () { nextDownload.download()}, 5000);
		})
		nextDownload.on('complete', function () {
			self.emit('itemcomplete', nextDownload);
			self.inprogress--;
			self.complete.push(nextDownload);
			self.current = undefined;
			self.runQueue();
		});
	}
}

module.exports = DownloadManager;
