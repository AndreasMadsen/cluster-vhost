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
		path = require("path"),
		http = require("http"),
		fs = require("fs"),
		util = require("util"),
		events = require("events"),
		os = require("os"),
		
	//Require the spawn method form the child_process module
		spawn = require("child_process").spawn,
	
	//Configuration placeholder
		config,
		
	//Get module root directory
		moduleRoot = fs.realpathSync(path.join(path.dirname(module.filename), "./../")),
	
	//Define 3 internal functions
		parseConfig, autoFind, ProgressTracker;
		
	//Define a configuration object parse function 
	parseConfig = function (configRead) {
		
		//Internal config object
		var configWrite = {};
		
		//Parse configuration object by protocol name
		["http", "https"].forEach(function (name) {
			
			var protocolObj = configRead[name];
			
			//Set default object
			configWrite[name] = {
				//use http:8001 and https:8002 
				port : name === "http" ? 8001 : 8002,
				host : "127.0.0.1"
			};
			
			//If the protocol is set inactive
			if (protocolObj === false) {
				configWrite[name] = false;
			}
			
			//If protocol settings is set
			else if (typeof protocolObj === "object" && protocolObj !== null) {
				
				//If a port is set
				if (protocolObj.port) {
					configWrite[name] = {
						port : parseInt(protocolObj.port, 10),
						host : typeof protocolObj.host === "string" ? protocolObj.host : undefined
					};
				}
				
				//If a socket is set
				else if (protocolObj.path) {
					configWrite[name] = {
						path : protocolObj.path.toString()
					};
				}
			}
		});
		
		//Parse configuration object socket directory
		if (typeof configRead.sock === "string") {
			configWrite.sock = fs.realpathSync(configRead.sock);
		} else {
			configWrite.sock = path.join(moduleRoot, "./sock/");
		}
		
		//Parse configuration object ssl directory
		if (typeof configRead.ssl === "string") {
			configWrite.ssl = fs.realpathSync(configRead.ssl);
		} else {
			//If no ssl is given don't use https
			configWrite.ssl = undefined;
			configWrite.https = false;
		}
		
		//Parse configuration object transparant proxy boolean
		if (typeof configRead.transparantProxy !== "boolean") {
			configWrite.transparantProxy = true;
		} else {
			configWrite.transparantProxy = configRead.transparantProxy;
		}
		
		//Return configuration object
		return configWrite;
	};
		
	//Define a function there find a config.json file
	autoFind = function () {
		
		//Create a search starting path
		var searchPath = path.dirname(module.filename);
		
		//Continue as long there is a subfolder
		do {
			
			//If there are a configuration file
			if (path.existsSync(path.join(searchPath, "config.json")) === true) {
				
				//Seach no longer when found
				return path.join(searchPath, "config.json");
			}
			
			//Get next search path
			searchPath = path.dirname(searchPath);
			
		} while (searchPath !== "/");
		
		//In any case return a empty object
		return undefined;
	};
	
	//Create a progress tracker there will keep track of how long we are in the proxy-server configuration
	ProgressTracker = function (config, master) {
		
		var self = this,
			cpus, workers, progress, i;
		
		//Get the number of cups workers
		cpus = os.cpus().length;
		workers = master.options.workers || cpus;
		
		//Create a progressTable
		progress = {
			socket : {},
			cluster : {},
			proxy : {}
		};
		
		//Create a socket state object
		progress.socket = {
			done : false,
			folder : false,
			http : false,
			https : false
		};
		
		//create a cluster state object
		progress.cluster = {
			done : false,
			workers : []
		};
		
		i = workers;
		while (i--) {
			progress.cluster.workers.push(false);
		}
		
		//Create a http and a https protocol object
		["http", "https"].forEach(function (protocol) {
			
			//Create master object
			progress.proxy[protocol] = {
				"use"		: config[protocol] !== false,
				"done"		: false,
				"ready"		: false,
				"master"	: false,
				"workers"	: []
			};
			
			//Create workers array
			var i = cpus;
			while (i--) {
				progress.proxy[protocol].workers.push(false);
			}
		});	
		
		//Create a each function there go thouge all protocols
		this.each = function (fn) {
			["http", "https"].forEach(function (protocol) {
				fn.call(self, progress.proxy[protocol], protocol);
			});
		};
		
		//Go thouge all protocols there are in use
		this.using = function (fn) {
			
			//Will a use array with the protocols name there is in use
			var use = [];
			self.each(function (protocol, name) {
				if (protocol.use === true) {
					use.push(name);
				}
			});
			
			//Run the function given as first argument
			use.forEach(fn);
		};
		
		//Update protocol state
		this.updateProtocolState = function (protocol) {
			
			var state = progress.proxy[protocol],
				missing = false;
			
			//Is master not ready
			if (state.master === false) {
				missing = true;
			}
			
			//Check workers
			else {
				state.workers.forEach(function (workerState) {
					if (workerState === false) {
						missing = true;
					} 
				});
			}
			
			//if nothing is missing
			if (missing === false) {
				
				//Set done
				state.done = true;
				
				//Emit done
				self.emit("proxy-done", protocol);
			}
		};
		
		//Update cluster state
		this.updateClusterState = function () {
			
			var state = progress.cluster,
				missing = false;
			
			//Check workers state
			state.workers.forEach(function (workerState) {
				if (workerState === false) {
					missing = true;
				}
			});
			
			//If nothing is missing emit ready
			if (missing === false) {
				state.done = true;
				self.checkReadyState();
			}
		};
		
		//Update socket state
		this.updateSocketState = function () {
			var state = progress.socket,
				missing = false,
				name = "";
			
			//Check socket states
			for (name in state) {
				if (state.hasOwnProperty(name) && name !== "done") {
					
					if (state[name] === false) {
						missing = true;
					}
				}
			}
			
			//If nothing is missing emit ready
			if (missing === false) {
				state.done = true;
				self.checkReadyState();
			}
		};
		
		//Check ready state
		this.checkReadyState = function () {
						
			//Make sure that the cluster and socket state is done
			if (progress.cluster.done === true && progress.socket.done === true) {
				self.emit("ready");
			}
		};
		
		//Check done state
		this.checkDoneState = function () {

			var missing = false;
			
			//Go thouge all protocol objects
			self.using(function (protocol) {
				if (protocol.done === false) {
					missing = true;
				}
			});
			
			//Emit finalized if nothing is missing
			if (missing === false) {
				self.emit("finalized");
			}
		};
		
		//Listen to messages from a datagram socket
		this.bindDatagram = function (protocol) {
			return function (data) {
				
				//Convert to data to string
				data = JSON.parse(data.toString());
				
				//If configuration is done
				if (data.state === "done") {
					//If master is ready
					if (data.type === "master") {
						self.emit("proxy-master", protocol);
					}
				
					//If worker is ready
					else if (data.type === "worker") {
						self.emit("proxy-worker", protocol, data.id);
					}
				}
				
				//If ready to recive data
				if (data.state === "ready") {
					self.emit("proxy-ready", protocol);
				} 
			};
		};
		
		//Emits when a single protocol proxy-server is configured
		//- set protocol object
		//- check all protocol object and emit finalized if nothing is missing
		this.addListener("proxy-done", function (protocol) {
			
			//Set protocol object
			progress.proxy[protocol].done = true;
			
			//Check done state
			this.checkDoneState();
		});
		
		//Emits when a single protocol-server is ready to recive data
		//- set protocol object
		this.addListener("proxy-ready", function (protocol) {
			progress.proxy[protocol].ready = true;
		});
		
		//When a worker is ready
		//- emit done if nothing is missing
		this.addListener("proxy-worker", function (protocol, worker) {
			
			//Set worker state
			progress.proxy[protocol].workers[worker] = true;
			
			//Update protocol state
			self.updateProtocolState(protocol);
		});
		
		//When a master is ready
		//- emit done if nothing is missing
		this.addListener("proxy-master", function (protocol) {
			
			//Set worker state
			progress.proxy[protocol].master = true;
			
			//Update protocol state
			self.updateProtocolState(protocol);
		});
		
		//When a cluster worker is spawned and connected
		//- emit ready if nothing is missing
		this.addListener("cluster-spawn", function (worker) {
			
			//Set worker state
			progress.cluster.workers[worker] = true;
			
			//Update cluster state
			self.updateClusterState();
		});
		
		//When a socket folder is created
		//- emit ready if nothing is missing
		this.addListener("socket-folder", function () {
			
			//Set folder state
			progress.socket.folder = true;
			
			//Update ready state
			self.updateSocketState();
		});
		
		//When a datagram socket is opened
		//- emit ready if nothing is missing
		this.addListener("socket-datagram", function (protocol) {
			
			//Set folder state
			progress.socket[protocol] = true;
			
			//Update ready state
			self.updateSocketState();
		});
		
		//Default behavoure
		return this;
	};
	
	//inherit EventEmitter 
	util.inherits(ProgressTracker, events.EventEmitter);
	
	//Export the plugin
	exports = module.exports = function (vhostname) {
		
		var masterfn = function (master) {
			
			//If this is a worker, and transparant proxy is set to true
			//configure http module to be more transparant
			if (master.isWorker && config.transparantProxy === true) {
				(function () {
					var HttpServer = http.Server;
					
					//Redifine http server
					http.Server = function (requestListener) {
						
						//Create a httpServer
						var server = new HttpServer(function (request) {
							
							//When a request is made reconfigure the removeAddress
							request.connection.remoteAddress = request.headers["x-forwarded-for"];
						});
						
						//Add requestListener option to the request event list
						if (requestListener) {
							server.addListener("request", requestListener);
						}
						
						//Return the native server object
						return server;
					};
					
					//Redefine also the CreateServer method to use the new http server constructor
					http.createServer = function (requestListener) {
						new http.Server(requestListener);
					};
				})();
			}
			
			//If this is the master - send vhost infomation
			else if (master.isMaster) {
				(function () {
					
					var serverPath, customEnverment, name, vhostMsg, configMsg, tracker, configureProxy;
					
					//Find http-proxy-server path
					serverPath = path.join(moduleRoot, "./lib/", "./server.js");
					
					//Create custom enverment
					customEnverment = {};
					for (name in process.env) {
						
						//Remove any CLUSTER properties
						if (Object.prototype.hasOwnProperty.call(process.env, name) && (name.match(/^CLUSTER/) === null)) {
							customEnverment[name] = process.env[name];
						}
					}
					
					//Create a ProgressTracker instace
					tracker = new ProgressTracker(config, master);
					
					//Emit "vhost configured" when configuration is finalized
					tracker.once("finalized", function () {
						master.emit("vhost configured");
					});
					
					//Create a config JSON string
					configMsg = JSON.stringify(config);
					
					//Create a vhost JSON string when cluster is ready
					master.once("listening", function () {
						
						vhostMsg = JSON.stringify([{
							"port" : master.port,
							"host" : master.host || "localhost",
							"vhost" : vhostname
						}]);
					});
					
					//Keep track of when cluster workers are connected
					master.once("listening", function () {
						master.on("worker connected", function thisFunction(worker) {
							
							//Remove the "worker connected" lisenter when all cluster worker is ready
							tracker.once("ready", function () {
								master.removeListener("worker connected", thisFunction);
							});
							
							tracker.emit("cluster-spawn", worker.id);
						});
					});
					
					//Create sock folder if needed
					path.exists(config.sock, function (exist) {
						if (exist === false) {
							fs.mkdir(config.sock, "0755", function () {
								tracker.emit("socket-folder");
							});
						} else {
							tracker.emit("socket-folder");
						}
					});
					
					//Open a datagram socket for http and https messages when socket-folder is created
					tracker.once("socket-folder", function () {
						
						//Go through all protocols
						tracker.each(function (protocolObject, protocol) {
							
							var datagramServer, serverPath;
							
							//If the protocol isn't in use - we are ready
							if (protocolObject.use === false) {
								tracker.emit("socket-datagram", protocol);
							}
							
							//Else create datagram socket
							else {
								
								//Make unix path
								serverPath = path.join(config.sock, protocol + ".udp.sock");
								
								//Create socket instance
								datagramServer = dgram.createSocket("unix_dgram");
								
								//When listing inform tracker.
								datagramServer.once("listening", function () {
									tracker.emit("socket-datagram", protocol);
								});
								
								//Bind datagram to tracker
								datagramServer.on("message", tracker.bindDatagram(protocol));
								
								//Close socket when proxy is configured
								tracker.on("proxy-done", function thisFunction(proxy) {
									
									//If the proxy match this protocol
									if (proxy === protocol) {
										datagramServer.close();
										
										//Remove also this listener function 
										tracker.removeListener("proxy-done", thisFunction);
									}
								});
								
								//Bind to serverPath
								datagramServer.bind(serverPath);
							}
						});
					});
					
					//Runs when we are ready to send vhost data
					tracker.once("ready", function () {
						
						//Configure proxy-server
						tracker.using(function (protocol) {
							configureProxy(protocol, true);
						});
					});
					
					//Method to update proxy server
					configureProxy = function (protocol, allowInit) {
						 
						var socket;
						
						//Create a new TCP socket and set encoding to uft8
						socket = new net.Socket();
						socket.setEncoding("utf8");
												
						//If a connection could be made set proxy state to ready and send vhost data
						socket.on("connect", function () {
							
							//Set proxy state to ready
							tracker.emit("proxy-ready", protocol);
							
							//Send vhost data end end connection
							socket.end(vhostMsg);
						});
						
						//error will be emitted if there was an error
						socket.on("error", function (err) {
							
							//If the error don't reflect "file don't exist or is inactive", throw the error
							if (err.code !== "ENOENT" && err.code !== "ECONNREFUSED") {
								throw err;
							}
							
							if (allowInit === false) {
								throw new Error("cloud not connect to proxy-server");
							}
							
							//If we are allowed to spawn a proxy server spawn proxy-server
							else if (allowInit === true) {

								//Listen on when proxy-master and its workers is ready to recive data
								tracker.on("proxy-ready", function thisFunction(proxy) {
									
									//Make sure that it is not another proxy-server there are ready
									if (proxy === protocol) {
										
										//It is important that the lisenter is removed before we try to connect again
										tracker.removeListener("proxy-ready", thisFunction);
										
										configureProxy(protocol, false);
									}
								});
								
								//Spawn a proxy-server 
								//Along with the spawn, there will be send information about:
								//- Protocol to use
								//- The configuration object
								spawn(process.execPath, [serverPath, protocol, configMsg], {
									customFds : [-1].concat(master.customFds),
									env : customEnverment
								});
							}
						});
										
						//Try to connect to the communication socket given by a unix path
						socket.connect(path.join(config.sock, protocol + ".tcp.sock"));
					
					};
					
				})();
			}
		};
		
		//Allow this plugin to be used in workers
		masterfn.enableInWorker = true;
		
		//return plugin to cluster
		return masterfn;
	};
	
	exports.config = function (configuration) {
		
		//Default configuration to an empty objecyt
		if (configuration === undefined) {
			configuration = {};
		}
		
		//if configuration is a string read the file an replace configuration with a JSON object
		if (typeof configuration === "string") {
			
			if (path.existsSync(path.resolve(configuration)) === true) {
				
				//Read the file -> parse as JSON -> get vhost object
				try {
					configuration = JSON.parse(fs.readFileSync(configuration, "utf8")).vhost;
				} catch (err) {
					throw new Error("The file " + configuration + " contain a syntax error");
				}
				
				//If the configuration object is undefined create an empty
				configuration = (configuration === undefined ? {} : configuration);
				
			} else {
				throw new Error("The file " + configuration + " do not exist");
			}   
		}
		
		//Parse the configuration object
		if (typeof configuration === "object" && configuration !== null) {
			config = parseConfig(configuration);
		} else {
			throw new Error("The configuration was given properly");
		}
		
		return this;
	};
	
	//Iniziate autoLoad
	exports.config(autoFind());
	
})(global, module);