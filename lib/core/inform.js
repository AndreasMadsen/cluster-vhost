/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */


(function () {
	"use strict";

	//get modules
	var thintalk = require('thintalk'),

		common = require('../common.js'),
		config = common.helper('config');

	exports.intercom = null;

	/**
	 * Open intercom
	 * callback will be called with arguments (null, null) if the channel is closed
	 */
	exports.open = function (cb) {
		if (exports.remote) {
			cb(null, exports.remote);
			return;
		}

		var requester = thintalk();

		// on callback the error event hander will be removed
		var callback = function (error) {
			requester.removeListener('error', errorHandler);
			cb(error, exports.intercom);
		};

		// we will assume that ECONNREFUSED or ENOENT mean that the proxy server isn't open
		var errorHandler = function (error) {
			if (error.code === 'ECONNREFUSED' || error.code === 'ENOENT') {
				callback(null);
				return;
			}
			callback(error);
		};

		// handle connect event
		requester.on('connect', function () {
			exports.intercom = requester;
			callback(null);
		});

		// handle errors
		requester.on('error', errorHandler);

		// reset remote when closed
		requester.on('close', function () {
			exports.intercom = null;
		});

		// connect to the TCP socket path
		requester.connect('TCP', common.socketPath);
	};

	/**
	 * we may assume that the intercom has been opened
	 */
	// setup remote
	exports.setup = function (callback) {
		exports.intercom.remote.setup(config.configuration, function () {
			callback(this.error || null);
		});
	};

	// add a proxy to remote
	exports.addProxy = function (host, address, callback) {
		exports.intercom.remote.addProxy({ host: host, address: address }, function () {
			callback(this.error || null);
		});
	};

})();
