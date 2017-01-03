const kurentoBrowser = require('kurento-browser-extensions');
window.getScreenConstraints = function(sendSource, callback) {
	callback(null, {
		video: {
			mediaSource: sendSource
		}
	});
};
const SpredClient = require('./models/spred-client');
window.Spred = {
	Client: SpredClient
};
