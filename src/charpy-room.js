var io = require('socket.io-client');

function Room(namespace, options) {
	options = options || {};

	var wss = io('wss://' + location.host || options.host);
}
