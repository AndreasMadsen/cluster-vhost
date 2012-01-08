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
	
	//Used to transport Errors over IPC
	exports.createObject = function (error) {
		var props = ['message', 'stack', 'type'],
			out = {},
			i = props.length,
			name;
		for (name in error) {
			out[name] = error[name];
		}
		while (i--) {
			out[props[i]] = error[props[i]];
		}
		
		return out;
	};
	
})();
