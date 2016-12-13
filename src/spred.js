const kurentoBrowser = require('kurento-browser-extensions');
console.log('PACKAGE exists');
window.getScreenConstraints = function(sendSource, callback) {
	callback(null, {
		video: {
			mediaSource: "screen"
		}
	});
};
console.log('Method exists');
const SpredClient = require('./models/spred-client');

window.Spred = {
	Client: SpredClient
};
