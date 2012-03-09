/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

(function () {
	"use strict";

	var cluster = require('cluster'),
		  thintalk = require('thintalk'),
      fs = require('fs'),

		  common = require('../common'),
		  save = common.helper('save'),
      state = common.state('state');

  // flags
  var running = false;

  // setup cluster to spawn a worker.js file
	cluster.setupMaster({
		exec: common.proxy('worker')
	});

  // proxy state holders
  var proxies = {};
	var fileQuery = new save.StaticFileStream(common.statePath);

  // setup a thintalk lisenter
  thintalk({

    setup: function (json) {
      // do only setup once
      if (running) {
        return this.callback(false);
      }
      running = true;

      // load the state.json file and fill up the proxies object
      loadProxyState(function (error, data) {
        if (error) {
          this.callback(error);
          return;
        }

        // set proxies object
        proxies = data;

        // open file stream
        fileQuery.open(function () {

          // setup cluster to keep a constant amout of workers online and propergate state
          state.createCluster({
            workers: json.workers,
            setup: json,
            save: updateProxy,
            load: readProxy
          }, this.callback.bind(this, true));
        });
      });
    },

    addProxy: function (json) {
      state.propergate('addProxy', json, this.callback);
    },

    removeProxy: function (json) {
      state.propergate('removeProxy', json, this.callback);
    }
  });

  // translate thintalk commands to proxies object
  function updateProxy(name, json) {
    switch(name) {
      case 'addProxy':
        proxies[json.host] = json.address;
        break;
      case 'removeProxy':
        delete proxies[json.host];
        break;
    }

    // update query
    fileQuery.write(JSON.stringify(proxies));
  }

  // translate proxies object to thintalk commands
  function readProxy(query) {
    Object.keys(proxies).forEach(function (hostname) {
      query('addProxy', { host: hostname, address: proxies[hostname] });
    });
  }

  // load the state.json file fill up the proxies object
	function loadProxyState(callback) {

		// read a state.json file and handle content
    fs.exists(common.statePath, function (exist) {

      // do nothing if the file don't exist
      if (!exist) {
        return callback(null, {});
      }

      // read the file
      fs.readFile(common.statePath, 'utf8', function (error, data) {
        if (error) {
          return callback(error, {});
        }

        // check that data exist
        if (data === '') {
          return callback(null, {});
        }

        // parse the data as JSON
        callback(null, JSON.parse(data));
      });
    });
	}

})();
