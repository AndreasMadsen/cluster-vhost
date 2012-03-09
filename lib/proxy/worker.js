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
    var proxies = {};

    /**
     * setup RPC lisenter
     */
    var listener = thintalk({
        setup: function (json) {
          var self = this;

          // track progress
          var missing = 2;
          var done = function () {
            missing -= 1;
            if (missing === 0) {
              self.callback();
            }
          };

          // start servers
          setupProxyServer('http', json, http, done);
          setupProxyServer('https', json, https, done);
        },

        addProxy: function (json) {
          var proxyObject = new proxy.HttpProxy({ target: json.address });

          proxies[json.host] = proxyObject;
          proxies['www.' + json.host] = proxyObject;

          this.callback();
        },

        removeProxy: function (json) {
          delete proxies[json.host];
          delete proxies['www.' + json.host];

          this.callback();
        }
    });
    listener.listen('IPC', process);

    /**
     * setup proxy servers
     */
    var setupProxyServer = function (name, setup, module, callback) {

      // check that setup options exist
      if (!setup[name]) {
        return callback();
      }

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

      server.on('request', function (req, res) {

        var host = req.headers.host;
        host = (host.indexOf(":") === -1 ? host : host.substr(0, host.indexOf(":")));

        //If virtual host is missing destroy the connection
        if (proxies[host] === undefined) {
          res.end('the hostname ' + host + ' don\'t exist');
          return;
        }

        //Proxy the main request
        proxies[host].proxyRequest(req, res);
      });

      server.on('upgrade', function (req, socket, head) {

        var host = req.headers.host;
        host = (host.indexOf(":") === -1 ? host : host.substr(0, host.indexOf(":")));

        //Proxy HTTP Upgrade requests
        proxies[host].proxyWebSocketRequest(req, socket, head);
      });

      // setup server to listen
      if (setup[name].path) {
        server.listen(setup[name].path, callback);
      } else {
        server.listen(setup[name].port, setup[name].host, callback);
      }
    };

})();
