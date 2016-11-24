const io = require('socket.io-client');
const _ = require('lodash');
const kurentoUtils = require('kurento-utils');
const request = require('request');

const SpredClient = function() {
	this.wss = null;
	this.webRtcPeer = null;
	this.video = document.getElementById('video');
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

SpredClient.prototype.connect = function(castId) {
	request.get('http://52.212.178.211:3000/casts/token/' + castId, function(err, res, body) {
		if (err) {
			console.error(err);
		} else {
			body = JSON.parse(body);
			this.castToken = body;
			this.wss = io('wss://52.212.178.211:8443');

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
	}.bind(this));
}

SpredClient.prototype.on = function(eventName, fn) {
	events[eventName] = fn;
}

function handleAuthRequest() {
	const wss = this.wss;
	const castToken = this.castToken;
	const sendAuthRequest = function(error) {
		if (error) return console.error(error);

		this.generateOffer(function(error, offerSdp) {
			if (error) return console.error(error);

			wss.emit('auth_answer', {
				token: castToken.cast_token,
				sdpOffer: offerSdp
			});
			console.info("An sdpOffer has been sent : ", offerSdp);
		});
	};

	console.log(this.video);

	var options = {
		onicecandidate: function(candidate) {
			console.info("Got a candidate : ", candidate);
			wss.emit('ice_candidate', {
				candidate: candidate
			});
		}
	};

	wss.on('ice_candidate', function(ice_candidate) {
		console.info('IceCandidate received from server : ', ice_candidate);
		this.webRtcPeer.addIceCandidate(ice_candidate.candidate);
	}.bind(this));

	if (castToken.presenter) {
		options.localVideo = this.video;
		this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, sendAuthRequest);
	} else {
		options.remoteVideo = this.video;
		this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, sendAuthRequest);
	}
}

function handleAuthAnswer(auth_answer) {
	if (auth_answer.status != 'accepted') {
		var errorMsg = auth_answer.message ? auth_answer.message : 'Unknow error';
		console.warn('Call not accepted for the following reason: ');
		console.warn(errorMsg);
		this.disconnect();
	} else {
		console.log('toto');
		console.log("VV: ", this.video);
		this.webRtcPeer.processAnswer(auth_answer.sdpAnswer);
		console.info("sdpAnswer received and processed : ", auth_answer.sdpAnswer);
	}
}

module.exports = SpredClient;
