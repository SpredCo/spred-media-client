var io = require('socket.io-client');

function create(namespace, options) {
	options = options || {};

	var wss = io('wss://' + location.host || options.host);
}

module.export = {
	create: create
}
