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
    
    //Require the event module
        events = require("events"),
        
    //Require the path module
        path = require("path"),
    
    //Private list of virtual hostnames
        vhost = [],
        
    //Parse configuration object
        config = JSON.parse(process.argv[3]),
        
    //Get the protocol name, and make sure it can only be http or https
        protocol = process.argv[2] === "http" ? "http" : "https";
    
    //Export the plugin
    exports = module.exports = {};
    
    //Add EventEmitter to plugin
    exports.vhost = new events.EventEmitter();

    //Export the vhost list
    exports.vhost.__defineGetter__("data", function () {
        return vhost;
    });
    
    exports.plugin = function () {
        console.log("plugin use");
        
        var masterfn = function (master) {
            
            console.log("got master object");
            
            var server, treatData;
            
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
                    exports.vhost.emit("push", data);
                });
            };
            
            //Parse vhost data given by the spawn method
            console.log("###", master.cmd[3]);
            treatData(master.cmd[3]);
            
            //Listen for new vhost data
            //If we are in the master use a unix socket
            if (master.isMaster) {
                
                console.log("### internal master");
                
                server = new net.Server();
                server.on("connection", function (socket) {
                    
                    //Run any data thouge the treatData function
                    socket.on("data", treatData);                
                });
                
                server.listen(path.join(config.sock, protocol + ".sock"));
            }
            
            //If we are in a worker
            else if (master.isWorker) {
                
                console.log("### internal worker");
                
                process.nextTick(function () {
                    //Create a vhost function:
                    //This will be invoked by the worker.frame method,
                    //it will resive data using worker.call("vhost", data).
                    //The communication will go thouge a customFd socket
                    master.worker.vhost = treatData;                    
                });
            }
            
        };

        //Allow this internal plugin to be used in workers
        masterfn.enableInWorker = true;
        
        return masterfn;
    };

})(global, module);