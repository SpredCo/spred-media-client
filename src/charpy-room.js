var io = require('socket.io-client');

Room = function(namespace, options) {
	options = options || {};

	var wss = io('wss://' + location.host || options.host);
};
