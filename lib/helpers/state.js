/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */


(function () {
  "use strict";

  var cluster = require('cluster'),
      utils = require('utils'),
      events = require('events'),
      thintalk = require('thintalk');

  var settings,
      workers = {};

  exports.createCluster = function (options, callback) {
    settings = options;

    // spawn required workers
    var i = settings.workers,
        missing = i;

    while (i--) {
      var worker = new Worker();
      worker.on('online', function () {
        missing -= 1;
        if (missing === 0) {
          callback();
        }
      });
    }
  };

  exports.propergate = function (name, json, callback) {

    // save new information in memory
    settings.save(name, json);

    // propergate information to all living workers
    var keys = Object.keys(workers),
        i = keys.length,
        missing = i;

    while (i--) {
      workers[ keys[i] ].remote[name](json, function () {
        missing -= 1;
        if (missing === 0) {
          if (callback) callback();
        }
      });
    }
  };

  function Worker() {
    var self = this;

    // spawn a new worker
    var worker = this.worker = cluster.fork();

    // save worker object
    workers[worker.uniqueID] = worker;

    // create query stack
    this.query = [];
    settings.load(function (name, json) {
      self.update(name, json, function () {});
    });

    // offline by default
    this.state = 'offline';

    // when worker is online execute init function
    this.requester = thintalk();

    // wait for remote connection
    this.requester.on('connect', function (remote) {
      self.remote = remote;

      // execute setup function
      remote.setup(settings.setup, function () {
        self.state = 'online';
        self.emit('online');
      });
    });

    // execute query stack when online
    worker.once('online', function () {
      var query = self.query;
      for (var i = 0, l = query.length; i < l; i++) {
        self.remote[ query[i].name ](query[i].json, query[i].callback);
      }
    });

    // detect offline state
    worker.once('death', function () {
      delete workers[worker.uniqueID];

      this.state = 'offline';
      self.emit('offline');
    });

    // respawn worker
    this.once('offline', function () {
      if (worker.suicide === false) {
        new Worker();
      }
    });
  }
  utils.inherits(Worker, events.EventEmitter);

  // update worker
  Worker.prototype.update = function (name, json, callback) {
    if (this.state === 'offline') {
      this.query.push({ name: name, json: json, callback: callback });
      return;
    }

    this.remote[name](json, callback);
  };

})();
