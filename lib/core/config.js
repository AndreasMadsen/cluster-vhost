/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
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
				host: '127.0.0.1'
			});
		};
	}

	//configuration parser
	exports.parser.defaults = {
		"workers": require('os').cpus().length,

		"http": protocolParser('http'),

		"ssl": function () {
			if (this && typeof this.sock === 'string') {
				return relativePath(this.ssl);
			}
		},

		"https": function () {
			if (this && typeof this.ssl === 'string') {
				return protocolParser('https').apply(this, arguments);
			}
			return false;
		},

		"transparantProxy" : function () {
			if (this) {
				return !!this.transparantProxy;
			}
			return true;
		},

		"output": function () {
			if (this && typeof this.output === 'string') {
				return relativePath(this.output);
			}
			return relativePath('output.txt');
		}
	};

	//result holder
	exports.configuration = false;
	exports.protocols = [];

  // should debug
  exports.debug = false;

})();