var io = require('socket.io-client');

var wss = io('wss://' + location.host);
