/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

(function () {
	"use strict";

	var cluster = require('cluster'),
		thintalk = require('thintalk'),
		EventEmitter = require('events').EventEmitter,

		common = require('../common'),
		state = common.helper('state');

	// contain the current state;
	var currentState = false;
	var workers = {};

	/**
	 * setup cluster to execute the proxy/worker.js file
	 */
	cluster.setupMaster({
		exec: common.proxy('worker')
	});

	/**
	 * master RPC handlers
	 */

	// create file query
	var fileQuery = new state.StaticFileStream(common.statePath);

	// RPC handlers
	var handlers = {
		setup: function (json) {
			if (currentState === false) {
				// set currentState
				currentState = { setup: json, proxies: {} };

				// open file query
				fileQuery.open();

				// update currentState
				fileQuery.write(JSON.stringify(currentState));

				// finally setup the cluster
				setupCluster(json, this.callback.bind(this, null));
				return;
			}
			this.callback(new Error('proxy server already running'));
		},

		state: function () {
			this.callback(currentState);
		},

		reset: function () {
			var self = this;
			currentState = false;

			var elems = Object.keys(cluster.workers),
				  missing = elems.length;

			// remove state file
			fileQuery.remove(function () {

				// destroy all workers
				elems.forEach(function (uniqueID) {
					var worker = cluster.workers[uniqueID];

					// execute callback when done
					worker.on('death', function () {
						missing -= 1;
						if (missing === 0) {
							self.callback();
						}
					});
					worker.destroy();
				});
			});
		},

		addProxy: function (json) {
			if (currentState) {
				currentState.proxies[json.host] = json.address;
				fileQuery.write(JSON.stringify(currentState));

				propagate('addProxy', json, this.callback);
				return;
			}
			this.callback(new Error('proxy server not running'));
		},

		removeProxy: function (json) {
			if (currentState) {
				delete currentState.proxies[json.host];
				fileQuery.write(JSON.stringify(currentState));

				propagate('removeProxy', json, this.callback);
				return;
			}
			this.callback(new Error('proxy server not running'));
		}
	};

	// setup a listener there will listen on a socket path given by process.argv[2]
	// it will store new infomation in a json file and relay information to workers
	var listener = thintalk(handlers);
	listener.listen('TCP', common.socketPath);

	// this wil read the state fill and emulate any RPC function
	state.readState(common.statePath, function (method, json, callback) {
		handlers[method].call({
			callback: callback || function () {}
		}, json);
	});

	/**
	 * setup a requesters used to relay information to workers
	 */
	var setupCluster = function (setup, callback) {
		var missing = setup.workers,
			  i = missing;

		// scoped while loop
		while (i--) (function () {

			// fork worker
			var worker = cluster.fork();

			// store worker in an event emitter
			// TODO, support also worker restart
			var store = workers[worker.uniqueID] = new EventEmitter();
			store.worker = worker;
			store.state = 'offline';

			// when all workers are online callback will be called
			store.on('online', function () {
				missing -= 1;
				if (missing === 0) {
					callback();
				}
			});

		})();
	};

	// create a RPC connection to new workers
	cluster.on('online', function (worker) {
		var store = workers[worker.uniqueID];
		var requester = thintalk(function (remote) {
			store.remote = remote;

			// set state to offline when worker die and remote from workers
			worker.on('death', function () {
				delete workers[worker.uniqueID];

				store.state = 'offline';
				store.emit('offline');

				if (!worker.suicide) {
					cluster.fork();
				}
			});

			// send them the current state
			remote.setup(currentState.setup, function () {
				if (this.error) throw this.error;

				store.state = 'online';
				store.emit('online');
			});

			// setup proxies in worker
			Object.keys(currentState.proxies).forEach(function (host) {
				remote.addProxy({ host: host, address: currentState.proxies[host] }, function () {
					if (this.error) throw this.error;
				});
			});
		});
		requester.connect('IPC', worker);
	});

	/**
	 * inform workers
	 */
	var propagate = function (method, json, callback) {
		var keys = Object.keys(workers),
			i = keys.length,
			missing = i;

		var inform = function (store) {
			store.remote[method](json, function () {
				missing -= 1;
				if (missing === 0) {
					callback();
				}
			});
		};

		// scoped while loop
		while (i--) (function (i) {
			var store = workers[ keys[i] ];

			// inform worker
			if (store.state === 'online') {
				inform(store);
				return;
			}

			// if the worker isn't online yet we will delay the message
			store.on('online', function () {
				inform(store);
			});
		})(i);
	};

})();
