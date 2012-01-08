/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

/*jshint strict: true, devel: true, node: true, debug: true,
  white: true, sub: false, newcap: true, curly: true, nomen: true,
  boss: true, eqeqeq: true, noarg: true, onevar: true, undef: true,
  regexp: true, noempty: true, maxerr: 999
 */
 

(function () {
	"use strict";
	
	var path = require('path'),
		childProcess = require('child_process'),
		common = require('../common.js'),
		config = common.helper('config'),
		tracker = common.helper('tracker'),
		status = common.helper('status'),
		isolate = common.helper('isolate');
	
	/**
	 * start the requested proxyservers, if they do not allready exist
	 */
	exports.init = function (callback) {
		status.proxyStatus(function (error, status) {
			if (error !== null) {
				callback(error);
				return;
			}
			
			//Call callback when all proxy servers are running
			var progress = tracker(callback);
			progress.add(config.protocols);
			
			//Check proxyserver
			config.protocols.forEach(function (protocol) {
				
				//this proxyserver is running
				if (status[protocol]) {
					progress.set(protocol);
					return;
				}
				
				//start proxyserver
				exports.startProxy(protocol, function (error) {
					if (error !== null) {
						callback(error);
						return;
					}
					progress.set(protocol);
				});
			});
			
		});
	};
	
	/**
	 * start a proxy server
	 */
	exports.startProxy = function (callback) {
		var child = childProcess.fork(path.join(common.proxyDir, 'master.js'), {silent: true});
		child.on('message', function (message) {
			
			//proxy is ready, lets isolate it from this process 
			if (message.cmd === 'ready') {
				isolate.call(child, function () {
					callback(null);
				});
			}
			
			//else kill the process, and return error message
			else if (message.cmd === 'error') {
				try {
					child.kill();
				} catch (e) {}
				callback(message.content);
			}
		});
	};
	
})();
