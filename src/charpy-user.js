const io = require('socket.io-client');
const _ = require('lodash');
const Room = require('./charpy-room');
const async = require('async');

const User = function(castToken) {
	this.wss = null;
	this.events = {
		'auth_request': [onAuthRequest],
		'auth_answer': [onAuthAnswer]
	};
	this.castToken = castToken;
};

User.prototype.connect = function() {
	this.wss = io('wss://localhost:8443');

	this.wss.on('connect_error', function(err) {
		console.error(`Got an error: ${err}`);
	});

	this.wss.on('connect', function() {
		async.each(this.events['connect'], (fn, next) => fn.bind(this)(next), (err) => {
			if (err) {
				console.error(err);
			} else {
				this.wss.on('auth_request', (auth_request) => {
					async.each(this.events['auth_request'], (fn, next) => fn.bind(this)(auth_request, next));
				});
			}
		});
	}.bind(this));
}

function onAuthRequest(auth_request, next) {
	console.log(auth_request);
	this.wss.on('auth_answer', function(auth_answer) {
		async.each(this.events['auth_answer'], (fn, next) => fn(auth_answer, next));
	}.bind(this));
	this.wss.emit('auth_answer', {
		token: this.castToken
	});
	return next();
}

function onAuthAnswer(auth_answer, next) {

}

//TODO: remove when client is ready

module.exports = User;
