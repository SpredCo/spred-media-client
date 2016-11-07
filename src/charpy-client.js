var io = require('socket.io-client');
var Room = require('./charpy-room');

var Client = function() {

};

Client.prototype.createRoom = function(id, castToken) {
	return new Room(id, castToken);
}

module.exports = new Client();
