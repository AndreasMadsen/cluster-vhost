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
	
	var common = require('../common'),
		path = require('path'),
		cluster = require('cluster'),
		net = require('net');
		
	cluster.setupMaster({
		exec: path.join(common.proxyDir, 'worker.js')
	});
	cluster.autoFork();
	
})();
