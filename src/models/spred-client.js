const io = require('socket.io-client');
const _ = require('lodash');
const kurentoUtils = require('kurento-utils');

const SpredClient = function(video, castToken) {
	this.wss = null;
	this.webRtcPeer = null;
	this.video = video;
	this.castToken = castToken;
	this.events = {
		'connect': [],
		'auth_request': [],
		'auth_answer': []
	}
};

SpredClient.prototype.disconnect = function() {
	if (this.webRtcPeer) {
		this.webRtcPeer.dispose();
		this.webRtcPeer = null;
	}
	this.wss.disconnect();
}

SpredClient.prototype.connect = function() {
	this.wss = io('wss://localhost:8443');

	this.wss.on('connect_error', function(err) {
		console.error(`Got an error: ${err}`);
	});

	this.wss.on('connect', function() {
		if (this.events['connect'].length) {
			_.forEach(this.events['connect'], (fn) => fn.bind(this)());
		}
	}.bind(this));

	this.wss.on('auth_request', handleAuthRequest.bind(this));
	this.wss.on('auth_answer', handleAuthAnswer.bind(this));
}

SpredClient.prototype.on = function(eventName, fn) {
	events[eventName] = fn;
}

function handleAuthRequest() {
	const webRtcPeer = this.webRtcPeer;
	const wss = this.wss;
	const sendAuthRequest = (error) => {
		if (error) return console.error(error);

		this.generateOffer(function(error, offerSdp) {
			if (error) return console.error(error);

			this.wss.emit('auth_answer', {
				token: this.castToken,
				sdpOffer: sdpOffer
			});
			console.info("An sdpOffer has been sent : ", offerSdp);
		});
	};

	if (!webRtcPeer) {
		var options = {
			localVideo: this.video,
			onicecandidate: function(candidate) {
				console.info("Got a candidate : ", candidate);
				wss.emit('ice_candidate', {
					candidate: candidate
				});
			}
		}
	}

	wss.on('ice_candidate', function(ice_candidate) {
		console.info('IceCandidate received from server : ', ice_candidate);
		webRtcPeer.addIceCandidate(ice_candidate.candidate);
	}.bind(this));

	if (this.castToken.presenter) {
		webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, sendAuthRequest);
	} else {
		console.log(kurentoUtils);
		webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, sendAuthRequest);
	}
}

function handleAuthAnswer(auth_answer) {
	if (auth_answer.response != 'accepted') {
		var errorMsg = auth_answer.message ? auth_answer.message : 'Unknow error';
		console.warn('Call not accepted for the following reason: ');
		console.warn(errorMsg);
		this.disconnect();
	} else {
		this.webRtcPeer.processAnswer(auth_answer.sdpAnswer);
		console.info("sdpAnswer received and processed : ", auth_answer.sdpAnswer);
	}
}

module.exports = SpredClient;
