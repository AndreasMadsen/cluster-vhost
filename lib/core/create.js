/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

(function () {
	"use strict";

	var immortal = require('immortal'),

		common = require('../common.js'),
		inform = common.core('inform'),
		config = common.helper('config');

	/**
	 * start the requested proxyservers, if they do not already exist
	 */
	exports.init = function (callback) {
		inform.open(function (error, intercom) {
			if (error !== null) {
				callback(error, null);
				return;
			}

			// proxy server is already online
			if (intercom) {
				callback(null, intercom);
				return;
			}

			// start proxy server
			exports.startProxy(function (error, intercom) {
				if (error !== null) {
					callback(error, null);
					return;
				}

				// setup cluster
				inform.setup(function () {
					callback(null, intercom);
				});
			});
		});
	};

	/**
	 * start a proxy server
	 */
	exports.startProxy = function (callback) {

		// continusely try to connect the proxy server
		var timeout = 2200;
		var tryConnect = function () {
			timeout -= 200;
			inform.open(function (error, intercom) {
				if (error !== null) {
					callback(error, null);
					return;
				}

				if (intercom) {
					callback(null, intercom);
					return;
				}

				if (timeout <= 0) {
					callback(new Error('timeout, could not create proxy server'), null);
					return;
				}

				// try again
				setTimeout(tryConnect, 200);
			});
		};

		// spawn proxy server as a unattached daemon
		immortal.start(common.proxy('master'), {
			strategy: 'development',
			options: {
				output: config.configuration.output
			}
		}, function (err) {
			if (err !== null) {
				callback(err);
				return;
			}

			// start continusely try connection
			tryConnect();
		});
	};

})();
