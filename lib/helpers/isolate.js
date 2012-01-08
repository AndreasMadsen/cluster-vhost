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
	
	module.exports = function (callback) {
		if (this.isolated) {
			return;
		}
		this.isolated = true;
	
		var need, got, setGot;
	
		//Disconnect IPC
		if (this._channel) {
			this._channel.close();
			this._channel = null;
		}
		
		need = 0;
		got = 0;
		setGot = function () {
			got++;
			if (got >= need) {
				if (callback) {
					callback();
				}
			}
		};
	
		//Destroy sockets
		if (this.stdin && !this.stdin.destroyed) {
			need++;
			this.stdin.once('close', setGot);
			this.stdin.destroy();
		}
		if (this.stdout && !this.stdout.destroyed) {
			need++;
			this.stdout.once('close', setGot);
			this.stdout.destroy();
		}
		if (this.stderr && !this.stderr.destroyed) {
			need++;
			this.stderr.once('close', setGot);
			this.stderr.destroy();
		}
		
		//Close internal
		this._internal.close();
		this._internal = null;
	};
	
})();