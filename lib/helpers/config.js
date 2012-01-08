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
	var path = require('path'),
		common = require('../common.js'),
		ConfigMe = require('configme');
		
	//parse options
	exports.parser = new ConfigMe('vhost', common.root);
	exports.parser.on('done', function (info) {	
		//save the configuration
		exports.configuration = info;
		
		//add protocols to exports.protocols
		if (info.http !== false) {
			exports.protocols.push('http');
		}
		if (info.https !== false) {
			exports.protocols.push('https');
		}
		
	});
	
	//relative directory
	function relativePath(filePath) {
		if (exports.parser.configPath) {
			filePath = path.join(path.dirname(exports.parser.configPath), filePath);
		}
		return path.resolve(filePath);
	}
	
	//protocol parser
	function protocolParser(protocol) {
		return function () {
			if (this && this[protocol] && this[protocol].path) {
				return { path: relativePath(this[protocol].path) };
			}
			
			return ConfigMe.parser(!!this ? this.http : {}, {
				port: protocol === 'http' ? 8001 : 8002,
				host: 'localhost'
			});
		};
	}
	
	//configuration parser
	exports.parser.defaults = {
		"http": protocolParser('http'),
		
		"ssl": function () {
			return (this && typeof this.sock === 'string') ? relativePath(this.ssl) : undefined;
		},
		
		"https": function () {
			if (this && typeof this.ssl === 'string') {
				return protocolParser('https').apply(this, arguments);	
			}
			return false;
		},
		
		"sock": function () {
			return (this && typeof this.sock === 'string') ? relativePath(this.sock) : common.socketDir;
		},
		
		"transparantProxy" : function () {
			return (this && this.transparantProxy === false) ? false : true;
		}
	};
	
	//result holder
	exports.configuration = false;
	exports.protocols = [];
	
})();