/**
 * Copyright (c) 2011 Andreas Madsen
 * GPL License Version 3
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

		var name, i;

		//type: array
		if (subject instanceof Array) {
			i = subject.length;
			while (i--) {
				this.states[subject[i]] = false;
			}
		}

		//type: true object
		else if (subject instanceof Object) {
			for (name in subject) {
				if (subject.hasOwnProperty(name) && subject[name] !== undefined) {
					this.states[name] = false;
				}
			}
		}

		//type: string
		else if (typeof subject === 'string') {
			this.states[subject] = false;
		}

		//worng type
		else {
			throw new TypeError("worng type parsed to ProgressTracker.add");
		}
	};

	ProgressTracker.prototype.set = function (name) {
		this.states[name] = true;
		this.check();
	};

	ProgressTracker.prototype.get = function (name) {
		return this.states[name];
	};

	ProgressTracker.prototype.check = function () {
		var state;
		for (state in this.states) {
			if (this.states.hasOwnProperty(state) && this.states[state] === false) {
				return;
			}
		}
		if (typeof this.callback === 'function' && this.called === false) {
			this.called = true;
			this.callback();
		}
	};

	module.exports = function (callback) {
		return new ProgressTracker(callback);
	};
})();
