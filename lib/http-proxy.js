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
	
	//Require http and https module
	var httpModule = require(process.argv[2] === "http" ? "http" : "https"),
	
	//Require native modules
		path = require("path"),
		fs = require("fs"),
	
	//Require http-proxy-server module
		proxy = require("http-proxy"),
		
	//Require internal plugin
		internal = require("./internal"),
	
	//Parse configuration object
		config = JSON.parse(process.argv[3]),
	
	//SSL options placeholder
		ssl = undefined,
	
	//Create a vhost proxy object
		vhost = {};
	
	//Listen for new vhost data
	internal.vhost.on("push", function (data, configurationDone) {
		
		data.forEach(function (info) {
			
			vhost[info.vhost] = new proxy.HttpProxy({
				target: {
					port : info.port,
					host : info.host
				}
			});
			//Proxy also www.*
			vhost["www." + info.vhost] = vhost[info.vhost];
		});
		
		//Run configurationDone since there are nothing more to do
		configurationDone();
	});
	
	//Create a ssl object if this cluster is made for https
	if (process.argv[2] === "https") {
		ssl = {
			key: fs.readFileSync(path.join(config.ssl, './key.pem'), 'utf8'),
			cert: fs.readFileSync(path.join(config.ssl, './cert.pem'), 'utf8')
		};
	}
	
	//Proxy HTTP(S) requests
	exports = module.exports = httpModule.createServer(function (req, res) {
		
		var host = req.headers.host;
		host = (host.indexOf(":") === -1 ? host : host.substr(0, host.indexOf(":")));
		
		//Store the host header
		req.headers['x-forwarded-host'] = req.headers.host;
		
		//If virtual host is missing destroy the connection
		if (vhost[host] === undefined) {
			res.connection.destroy();
		}
		//Proxy the main request
		else {
			vhost[host].proxyRequest(req, res);
		}
	});

	exports.on('upgrade', function (req, socket, head) {
		
		//Proxy HTTP Upgrade requests
		vhost[req.header.host].proxyWebSocketRequest(req, socket, head);
	});
	
})(global, module);