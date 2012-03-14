/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
 */

(function () {
  "use strict";

  //get modules
  var path = require('path');

  // is root detection
  exports.isRoot = process.getuid() === 0;

  //get the module root directory
  exports.moduleRoot = path.join(path.dirname(module.filename), '/../');

  //shortcut to library
  exports.libraryDir = path.join(exports.moduleRoot, '/lib/');

  //define library directorys
  exports.helperDir = path.join(exports.libraryDir, '/helpers/');
  exports.coreDir = path.join(exports.libraryDir, '/core/');
  exports.proxyDir = path.join(exports.libraryDir, '/proxy/');

  //define socket folder path
  var filename = 'intercom-' + (exports.isRoot ? 'root' : 'user') + '.tcp';
  exports.socketPath = path.join(exports.moduleRoot, '/intercom/' + filename);
  exports.statePath = path.join(exports.moduleRoot, '/intercom/state.json');

  //lazy load helpers
  exports.helper = function (name) {
    return require(path.join(exports.helperDir, name + '.js'));
  };

  //lazy load proxy
  exports.proxy = function (name) {
    return path.join(exports.proxyDir, name + '.js');
  };

  //lazy load core
  exports.core = function (name) {
    return require(path.join(exports.coreDir, name + '.js'));
  };

})();
