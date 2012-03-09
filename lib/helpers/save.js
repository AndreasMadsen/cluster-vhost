/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

(function () {
	"use strict";

	var fs = require('fs');

	function StaticFileStream(filepath) {
		this.fd = null;
		this.query = [];
		this.draining = false;
		this.filepath = filepath;
	}
	exports.StaticFileStream = StaticFileStream;

	// add query and begin draining
	StaticFileStream.prototype.write = function (content) {
		// add content to query
		this.query.push(content);

		// begin draining if a file descriptor exist
		if (this.fd) this.drain();
	};

	// execute query
	StaticFileStream.prototype.drain = function (callback) {
		if (this.draining) return;
		this.draining = true;

		// do not handle query if it's empty
		if (this.query.length === 0) {
			this.draining = false;
			return;
		}

		var self = this;
		this.update(function handle() {
			// stop if query is empty
			if (self.query.length === 0) {
				self.draining = false;
				if (callback) callback();
				return;
			}

			// handle next query item
			self.update(handle);
		});
	};

	// update file
	StaticFileStream.prototype.update = function (callback) {
		var fd = this.fd;
		var content = this.query.shift();
		var buffer = new Buffer(content);

		fs.truncate(fd, 0, function () {
			fs.write(fd, buffer, 0, buffer.length, 0, callback);
		});
	};

	// open up file file descriptor
	StaticFileStream.prototype.open = function (callback) {
		var self = this;
		if (this.fd) {
			if (callback) callback();
			return;
		}

		fs.open(this.filepath, 'w', function (error, fd) {
			self.fd = fd;
			if (callback) callback();
		});
	};

	// close file descriptor
	StaticFileStream.prototype.close = function (callback) {
		fs.close(this.fd, callback);
	};

	// remove file descriptor
	StaticFileStream.prototype.remove = function (callback) {
		var self = this;

		// just remove file if channel is closed
		if (self.fd === null) {
			fs.unlink(self.filepath, callback);
			return;
		}

		this.close(function () {
			self.fd = null;
			fs.unlink(self.filepath, callback);
		});
	};

})();
