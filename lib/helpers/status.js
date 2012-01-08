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
	
	//get modules
	var net = require('net'),
		path = require('path'),
		common = require('../common.js'),
		config = common.helper('config');
	
	//get proxy status
	function getProxyStatus(protocol, callback) {
		var client = net.connect(path.join(config.configuration.sock, protocol + '.sock'));
		client.on('connect', function () {
			callback(true);
			client.end();
		});
		client.on('error', function () {
			callback(false);
		});
	}
	exports.proxyStatus = function (callback) {
		
		var results, tracker;
		
		results = {};
		config.protocols.forEach(function (protocol) {
			results[protocol] = false;
		});
		
		//create a new tracker
		tracker = new exports.Tracker(function () {
			
			//detect missing proxy servers
			var missing = false;
			config.protocols.forEach(function (protocol) {
				if (results[protocol] === false) {
					missing = true;
				}
			});
			results.online = !missing;
			
			//send results
			callback(results);
		});
		tracker.add(results);
		
		//get proxy status
		config.protocols.forEach(function (protocol) {
			getProxyStatus(protocol, function (online) {
				results[protocol] = online;
				tracker.set(protocol);
			});
		});
		
	};
	
})();