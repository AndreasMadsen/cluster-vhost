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

	// Small progress tracker
	function ProgressTracker(callback) {
		this.callback = callback;
		this.states = {};
		this.called = false;
	}
	
	ProgressTracker.prototype.add = function (subject) {
		if (typeof subject === 'object') {
			var name;
			for (name in subject) {
				if (subject.hasOwnProperty(name) && subject[name] !== undefined) {
					this.states[name] = false;
				}
			}
		} else {
			this.states[subject] = false;
		}
	};
	
	ProgressTracker.prototype.set = function (name) {
		this.states[name] = true;
		this.check();
	};
	
	ProgressTracker.prototype.check = function () {
		var state;
		for (state in this.states) {
			if (this.states.hasOwnProperty(state) && this.states[state] === false) {
				return;
			}
		}
		if (typeof this.callback === 'function' && !this.called) {
			this.callback();
		}
		this.called = true;
	};
	
	module.exports = ProgressTracker;
})();
