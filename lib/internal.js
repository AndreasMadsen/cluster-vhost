/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

/*jshint strict: true, devel: true, node: true, debug: true,
  white: true, sub: false, newcap: true, curly: true, nomen: true,
  boss: true, eqeqeq: true, noarg: true, onevar: true, undef: true,
  regexp: true, noempty: true, maxerr: 999
 */

(function (global, module, undefined) {

	//ECMA 5 strict mode will be used
	"use strict";
	
	//Require native modules
	var net = require("net"),
		dgram = require("dgram"),
		events = require("events"),
		path = require("path"),
		util = require("util"),
	
	//Private list of virtual hostnames
		vhost = [],
		
	//Parse configuration object
		config = JSON.parse(process.argv[3]),
		
	//Get the protocol name, and make sure it can only be http or https
		protocol = process.argv[2] === "http" ? "http" : "https",
		
	//Define an internal trackker
		ProgressTracker;
	
	//Export the plugin
	exports = module.exports = {};
	
	//Add EventEmitter to plugin
	exports.vhost = new events.EventEmitter();

	//Export the vhost list
	exports.vhost.__defineGetter__("data", function () {
		return vhost;
	});
	
	//Create a progress tracker there will keep track of how long we are before we can recive vhost data
	ProgressTracker = function (config, master) {
		
		var self = true,
			progress, workers;
		
		//get workers
		workers = master.options.workers;
		
		//Create a progressTable
		progress = {
			resiver : {}
		};
		
		//Create receiver object
		progress.receiver = {
			ready : false,
			master : false,
			workers : []
		};
		while (workers--) {
			progress.resiver.workers.push(false);
		}
		
		//Update receiver state
		this.updateReceiverState = function () {
			
			var missing = false,
				state = progress.receiver,
				i = 0;
			
			//Check master state
			if (state.master === false) {
				missing = true;
			}
			
			//Check worker state
			i = state.workers.length;
			while (i--) {
				if (state.workers[i] === false) {
					missing = true;
				}
			}
			
			//Check missing
			if (missing === false) {
				state.ready = true;
				self.checkReceiverState();
			}
		};
		
		//Check receiver state
		this.checkReceiverState = function () {
			
			//Check ready state
			if (progress.receiver.ready === true) {
				self.emit("receiver-ready");
			}
		};
		
		//Emits when the master is ready to recive vhost data
		this.addListener("receiver-master", function () {
			
			//Set master state
			progress.resiver.master = true;
			
			//Update ready state
			self.updateReceiverState();
		});
		
		//Emits when a worker is ready to recive vhost data
		this.addListener("receiver-worker", function (worker) {
			
			//Set worker state
			progress.resiver.workers[worker] = true;
			
			//Update ready state
			self.updateReceiverState();
		});
		
		//Default behavoure
		return this;
	};
	
	//inherit EventEmitter 
	util.inherits(ProgressTracker, events.EventEmitter);

	
	
	exports.plugin = function () {
		
		var masterfn = function (master) {
			
			var treatData, configurationDone;
			
			//Create a function there send UDP messages when configuration is done
			configurationDone = function () {
				
				var type, worker, message, client, serverPath;
				
				//Get type
				type = master.isMaster ? "master" : "worker";
				
				//Get worker id				
				if (type === "worker") {
					worker = master.worker.id;
				} else {
					worker = null;
				}
				
				//create message
				message = new Buffer(JSON.stringify({
					"state" : "done",
					"type" : type,
					"id" : worker
				}));
						
				//Create datagram client
				client = dgram.createSocket("unix_dgram");
				
				//Create unix path string
				serverPath = path.join(config.sock, protocol + ".udp.sock");
				
				//Send a ready message
				client.send(message, 0, message.length, serverPath, function () {
					
					//Close client when done
					client.close();
				});
			};
			
			//Create a function there treats new data
			treatData = function (data) {
				
				var workers, i;
				
				//parse data
				if (typeof data === "string") {
					data = JSON.parse(data);
				}
				
				//push data
				vhost = vhost.concat(data);
				
				//Save data in the command array
				//This will be used i case the master crach
				//And when a worker is started or restarted
				if (master.cmd.length === 3) {
					master.cmd.push("");
				}
				master.cmd[3] = JSON.stringify(vhost);
					
				//Update workers with new vhost data
				//Remember that there are no childrens when the master starts
				if (master.isMaster) {
					workers = master.children;
					i = workers.length;
					while (i--) {
						workers[i].call("vhost", data);
					}
				}
				
				//Emit push event when new vhost data is parsed
				process.nextTick(function () {
					exports.vhost.emit("push", data, configurationDone);
				});
			};
			
			//Listen for new vhost data
			//If we are in the master use a unix socket
			if (master.isMaster) {
				
				(function () {
					
					var resiver, tracker;
					
					//Create a new progress tracker
					tracker = new ProgressTracker(config, master);
					
					//When we are ready to recive send a udp message
					tracker.once("receiver-ready", function () {
						
						//Create datagram client
						var client = dgram.createSocket("unix_dgram"),
						
						//Create unix path string
							serverPath = path.join(config.sock, protocol + ".udp.sock"),
						
						//Define message
							message = new Buffer(JSON.stringify({
								"state" : "ready",
								"type" : "master",
								"id" : null
							}));
						
						//Send a ready message
						client.send(message, 0, message.length, serverPath, function () {
							
							//Close client when done
							client.close();
						});
					});
					
					//Run configurationDone when all vhost data is pushed to workers
					exports.vhost.on("push", function (data, configurationDone) {
						configurationDone();
					});
					
					//When the master receive a "worker connected" message - emit a "receiver-worker" ready
					master.once("listening", function () {
						master.on("worker connected", function thisFunction(worker) {
							
							//Remove the "worker connected" lisenter when all cluster worker is ready
							tracker.once("receiver-ready", function () {
								master.removeListener("worker connected", thisFunction);
							});
							
							tracker.emit("receiver-worker", worker.id);
						});
					});
					
					//Create a vhost data socket reciver
					resiver = new net.Server();
					resiver.on("connection", function (socket) {
						
						//Run any data thouge the treatData function
						socket.on("data", function (data) {
							treatData(data, socket);
						});
					});
					
					//When we are ready to recive emit "receiver-master"
					resiver.listen(path.join(config.sock, protocol + ".tcp.sock"), function () {
						tracker.emit("receiver-master");
					});
					
				})();
			}
			
			//If we are in a worker
			else if (master.isWorker) {
				
				(function () {
					
					process.nextTick(function () {
						//Create a vhost function:
						//This will be invoked by the worker.frame method,
						//it will resive data using worker.call("vhost", data).
						//The communication will go thouge a customFd socket
						master.worker.vhost = treatData;
					});
					
				})();
			}
			
		};

		//Allow this internal plugin to be used in workers
		masterfn.enableInWorker = true;
		
		return masterfn;
	};

})(global, module);