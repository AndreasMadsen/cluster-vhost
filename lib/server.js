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
    
    //Require the path module
        path = require("path"),
    
    //Require the cluster module
        cluster = require("cluster"),
        
    //Require the intenal plugin there will manage http-proxy-server master and workers
        internal = require("./internal.js"),
        
    //Parse configuration object
        config = JSON.parse(process.argv[3]);
    
    //Start cluster
    (function () {
        
        var clusterObject, options;
        
        //Get options
        options = config[process.argv[2]];
        
        //Create a new cluster application        
        clusterObject = cluster(path.join(path.dirname(module.filename), "./http-proxy.js"));
        
        //Use the internal plugin
        clusterObject.use(internal.plugin())
        
        //Listen
        if (options.port) {
            clusterObject.listen(options.port, options.host);
        } else {
            clusterObject.listen(options.host);
        }
        
    })();
    
})(global, module);