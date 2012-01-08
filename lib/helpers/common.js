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
	var path = require('path');
	
	//get the module root directory
	exports.moduleRoot = path.join(path.dirname(module.filename), '/../../');
	
	//shortcut to library
	exports.libraryDir = path.join(exports.moduleRoot, '/lib/');
	
	//define library directorys
	exports.helperDir = path.join(exports.libraryDir, '/helpers/');
	exports.coreDir = path.join(exports.libraryDir, '/core/');
	exports.proxyDir = path.join(exports.libraryDir, '/proxy/');
	
	//define socket folder path
	exports.socketDir = path.join(exports.moduleRoot, '/sockets/');
	
	//lazy load helpers
	exports.helper = function (name) {
		return require(path.join(exports.helperDir, name + '.js'));
	};
	
	//lazy load core
	exports.core = function (name) {
		return require(path.join(exports.coreDir, name + '.js'));
	};
})();