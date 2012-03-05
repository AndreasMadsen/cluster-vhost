/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

(function () {
	"use strict";

	var util = require('util'),
		events = require('events'),
		cluster = require('cluster'),

		common = require('./common.js'),
		config = common.helper('config'),
		tracker = common.helper('tracker'),
		inform = common.core('inform'),
		create = common.core('create'),

	//variables
	vhost, progress;

	/**
	 * create vhost object
	 */
	//create a object with "vhost" as its constructor name
	vhost = module.exports = (function () {
		function vhost() {}
		util.inherits(vhost, events.EventEmitter);
		return new vhost();
	})();

    vhost.debug = function (flag) {
        config.debug = flag;
    };

	/**
	 * setup progress tracker
	 */
	progress = tracker(function () {
		inform.setup(vhost.domain, vhost.address, function (error) {
			if (error !== null) {
				vhost.emit('error', error);
				return;
			}
			vhost.emit('done');
		});
	});
	progress.add(['proxy-ready', 'config-search', 'domain', 'cluster-listening']);

	/**
	 * setup configuration parser
	 */
	config.parser.on('done', function () {
		//When the parser has read the configuration initalize the proxy-server
		create.init(function (error, intercom) {
			if (error !== null) {
				vhost.emit('error', error);
				return;
			}

			// relay errors from intercom when connection is made
			intercom.on('error', vhost.emit.bind(vhost, 'error'));

			// set proxy-ready state
			progress.set('proxy-ready');
		});
	});

	//relay errors
	config.parser.on('error', vhost.emit.bind(vhost, 'error'));

	//allow manual configuration
	vhost.config = function (info) {
		if (progress.get('config-search') === false) {
			config.parser.manual(info);
			progress.set('config-search');
		}
	};

	/**
	 * setup proxy configuration
	 */
	//When the cluster is listening we can get the proxy values
	cluster.once('listening', function (address) {
		Object.defineProperty(vhost, 'address', {value: address});
		progress.set('cluster-listening');
	});

	//This will set the domain name and start the configuration search
	vhost.use = function (domain) {
		Object.defineProperty(this, 'domain', {value: domain});
		progress.set('domain');

		//search for configuration file
		if (progress.get('config-search') === false) {
			config.parser.search();
		}
	};

})();
