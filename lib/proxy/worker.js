/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

(function () {
	"use strict";

	var fs = require('fs'),
        path = require('path'),
        http = require('http'),
        https = require('https'),
        thintalk = require('thintalk'),
        proxy = require('http-proxy'),
        
        existsSync = fs.existsSync || path.existsSync;
    
    /**
     * contain the current setup
     */
    var vhost = {},
        setup = null;
    
    /**
     * setup RPC lisenter
     */
    var listener = thintalk({
        setup: function (json) {
            setup = json;
            
            if (json.http) {
                setupProxyServer('http', http);
            }
            
            if (json.https) {
                setupProxyServer('https', https);
            }
            
            this.callback();
        },
        
        addProxy: function (json) {
            var proxyObject = new proxy.httpProxy({
				target: {
					port : json.address.port,
					host : json.address.host
				}
            });
            
            vhost[json.host] = proxyObject;
			vhost['www.' + json.host] = proxyObject;
            
            this.callback();
        },
        
        removeProxy: function (json) {
            delete vhost[json.host];
            delete vhost['www.' + json.host];
            
            this.callback();
        }
    });
    listener.listen('IPC', process);
    
    /**
     * setup proxy servers
     */
    var setupProxyServer = function (name, module) {
        
        // create SSL option object
        var options;
        if (name === 'https') {
            options = {};
            
            var certPath = path.join(setup.ssl, 'cert.pem');
            if (existsSync(certPath)) {
                options.cert = fs.readFile(certPath, 'utf8');
            }
            
            var keyPath = path.join(setup.ssl, 'key.pem');
            if (existsSync(keyPath)) {
                options.key = fs.readFile(keyPath, 'utf8');
            }
        }
        
        //Proxy HTTP(S) requests
        var server = module.createServer(options);
        
        server.on('connection', function (req, res) {
    
            var host = req.headers.host;
            host = (host.indexOf(":") === -1 ? host : host.substr(0, host.indexOf(":")));
            
            //Store the host header
            if (setup[name].transparantProxy) {
                req.headers['x-forwarded-host'] = req.headers.host;
            }
            
            //If virtual host is missing destroy the connection
            if (vhost[host] === undefined) {
                res.end('the hostname ' + host + ' don\'t exist');
                return;
            }
            
            //Proxy the main request
            vhost[host].proxyRequest(req, res);
        });
        
        server.on('upgrade', function (req, socket, head) {
            
            //Proxy HTTP Upgrade requests
            vhost[req.header.host].proxyWebSocketRequest(req, socket, head);
        });
        
        // setup server to listen
        if (setup[name].path) {
            server.listen(setup[name].path);
        } else {
            server.listen(setup[name].port, setup[name].host);
        }
    };
    
})();
