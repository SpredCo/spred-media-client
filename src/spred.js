function getScreenConstraints(sendSource, callback) {
	var isFirefox = typeof window.InstallTrigger !== 'undefined';
	var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
	var isChrome = !!window.chrome && !isOpera;

	var firefoxScreenConstraints = {
		mozMediaSource: 'window',
		mediaSource: 'window'
	};

	if (isFirefox) return callback(null, firefoxScreenConstraints);

	// this statement defines getUserMedia constraints
	// that will be used to capture content of screen
	var screen_constraints = {
		mandatory: {
			chromeMediaSource: sendSource,
			maxWidth: screen.width > 1920 ? screen.width : 1920,
			maxHeight: screen.height > 1080 ? screen.height : 1080
		},
		optional: []
	};

	// // this statement verifies chrome extension availability
	// // if installed and available then it will invoke extension API
	// // otherwise it will fallback to command-line based screen capturing API
	// if (chromeMediaSource == 'desktop' && !sourceId) {
	// 	getSourceId(function() {
	// 		screen_constraints.mandatory.chromeMediaSourceId = sourceId;
	// 		callback(sourceId == 'PermissionDeniedError' ? sourceId : null, screen_constraints);
	// 	});
	// 	return;
	// }
	//
	// // this statement sets gets 'sourceId" and sets "chromeMediaSourceId"
	// if (chromeMediaSource == 'desktop') {
	// 	screen_constraints.mandatory.chromeMediaSourceId = sourceId;
	// }

	// now invoking native getUserMedia API
	callback(null, screen_constraints);
}

window.getScreenConstraints = getScreenConstraints;

const SpredClient = require('./models/spred-client');

window.Spred = {
	Client: SpredClient
};

// const token = "pKbJtjKBDqnC3HBT1sYxw0vcI0pEG6MllnOMLHsRtCfWofkxaXQpEZoMcMtourrUKMCRo5YSOf7GbhAgwvVNCz8VhpYUMRDkjJJGNpvxu62xM67gIuJKye43WuQ1uQ3A24qWwsecPkKnuAuIB8lJZ9LmYJr0w1OGIAogDOMLJAiH4wQdrFn3dezwDCcpAsYBXEVnGkLBlkJRrxqfqXwCb7bkbnJ9FtKFkbKAqHOJjIDOAVjrV95bnCNOM69a1cTx"
// const client = new SpredClient(token);

// client.connect();
