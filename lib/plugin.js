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
    
    //Require the net module
    var net = require("net"),
    
    //Require path module
        path = require("path"),
    
    //Require http module
        http = require("http"),
    
    //Require file system module
        fs = require("fs"),
    
    //Require the spawn method form the child_process modile
        spawn = require("child_process").spawn,
    
    //Configuration placeholder
        config,
        
    //Get module root directory
        moduleRoot = fs.realpathSync(path.join(path.dirname(module.filename), "./../"));
    
    //Find the config.json object
    (function () {
        var searchPath, configObject;
        
        //Create a search path
        searchPath = path.dirname(module.filename);
        
        //Create an empty config object object
        config = {}; // private
        configObject = {}; //temporaly
        
        //Continue as long there is a subfolder
        do {
            
            //If there are a configuration file
            if (path.existsSync(path.join(searchPath, "config.json")) === true) {
                
                //Read the file -> parse as JSON -> get vhost object
                configObject = JSON.parse(fs.readFileSync(fs.join(searchPath, "config.json"), "utf8")).vhost;
                
                //If the configuration object is undefined create an empty
                configObject = (configObject === undefined ? {} : configObject);
                
                //Seach no longer when found
                break;
            }
            
            //Get next search path
            searchPath = path.dirname(searchPath);
            
        } while (searchPath !== "/");
        
        //Parse configuration object by protocol name
        ["http", "https"].forEach(function (name) {
            
            var protocolObj = configObject[name];
            
            //Set default object
            config[name] = {
                //use http:8001 and https:8002 
                port : name === "http" ? 8001 : 8002,
                host : "127.0.0.1"
            };
            
            //If the protocol is set inactive
            if (protocolObj === false) {
                config[name] = false;
            }
            
            //If protocol settings is set
            else if (typeof protocolObj === "object" && protocolObj !== null) {
                
                //If a port is set
                if (protocolObj.port) {
                    config[name] = {
                        port : parseInt(protocolObj.port, 10),
                        host : typeof protocolObj.host === "string" ? protocolObj.host : undefined
                    };
                }
                
                //If a socket is set
                else if (protocolObj.path) {
                    config[name] = {
                        path : protocolObj.path.toString()
                    };
                }
            }
        });
        
        //Parse configuration object socket directory
        if (typeof configObject.sock === "string") {
            config.sock = fs.realpathSync(configObject.sock);
        } else {
            config.sock = path.join(moduleRoot, "./sock/");
        }
        
        //Create folder if needed
        if (path.existsSync(config.sock) === false) {
            fs.mkdirSync(config.sock, "0755");
        }
        
        //Parse configuration object ssl directory
        if (typeof configObject.ssl === "string") {
            config.ssl = fs.realpathSync(configObject.ssl);
        } else {
            //If no ssl is given don't use https
            config.ssl = undefined;
            config.https = false;
        }
        
        //Parse configuration object transparant proxy boolean
        if (typeof configObject.transparantProxy !== "boolean") {
            config.transparantProxy = true;
        } else {
            config.transparantProxy = configObject.transparantProxy;
        }
        
    })();
    
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
                    var serverPath, customEnverment, name, sendVhostData;
                    
                    //Find http-proxy-server path
                    serverPath = path.join(moduleRoot, "./lib/", "./server.js");
                    
                    //Create custom enverment
                    customEnverment = {};
                    for (name in process.env) {
                        if (Object.prototype.hasOwnProperty.call(process.env, name) && (name.match(/^CLUSTER/) === null)) {
                            customEnverment[name] = process.env[name];
                        }
                    }
                        
                    sendVhostData = function () {
                        
                        ["http", "https"].forEach(function (name) {
                            
                            if (config[name] !== false) {
                                
                                //get the port and host
                                var vhostMsg = JSON.stringify([{
                                        "port" : master.port,
                                        "host" : master.host || "localhost",
                                        "vhost" : vhostname
                                    }]),
                                    configMsg = JSON.stringify(config),
                                
                                //Create a new TCP socket and try to connect to the REPL
                                    socket = new net.Socket();
                                
                                //"connect" will be emitted if the socket is established
                                socket.on("connect", function () {
                                    
                                    //Send extra vhost data and close socket
                                    socket.end(vhostMsg);
                                });
                                
                                //"error" will be emitted if there was an error
                                socket.on("error", function (err) {
                                    
                                    //If the file don't exist or is inactive
                                    if (err.code === "ENOENT" || err.code === "ECONNREFUSED") {
                                        
                                        //Along with the spawn, there will be send:
                                        //- Protocol to use
                                        //- The configuration object
                                        //- A simple vhost object
                                        spawn(process.execPath, [serverPath, name, configMsg, vhostMsg], {
                                            customFds : [-1].concat(master.customFds),
                                            env : customEnverment
                                        });
                                    }
                                    
                                });
                                
                                //Try to connect to the communication socket given by a unix path
                                socket.connect(path.join(config.sock, name + ".sock"));
                            }
                        });
                    };
                    
                    //Run sendVhostData when all workers are connected
                    master.once("listening", function () {
                        master.on("worker connected", function (worker) {
                            if (worker.id === 0) {
                                
                                sendVhostData();
                            }
                        });
                    });
                    
                })();
            }
           
            //Allow this plugin to be used in workers
            masterfn.enableInWorker = true;
            
            //return plugin to cluster
            return masterfn;
        };
    };
    
})(global, module);