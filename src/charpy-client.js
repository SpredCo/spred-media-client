var io = require('socket.io-client');
var Room = require('./charpy-room');

var Client = function() {
	this.wss = null;
	this.users = [];
};

Client.prototype.createRoom = function() {
	return new Room('test');
}

module.exports = new Client();
