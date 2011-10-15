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
        
    //Get the cluser module form the node module chache 
    var cluster = require("cluster");
    
    //Add a plugin to cluster
    cluster.__defineGetter__("vhost", function() {
        return require('./lib/plugin.js');
    });

})(global, module);