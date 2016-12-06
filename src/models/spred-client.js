const io = require('socket.io-client');
const _ = require('lodash');
const kurentoUtils = require('kurento-utils');
const request = require('request');

const SpredCast = require('./spredcast');
const Message = require('./message');

const SpredClient = function() {
	this.wss = null;
	this.webRtcPeer = null;
	this.video = document.getElementById('video');
	this.spredCast = new SpredCast();
	this.events = {
		'connect': [],
		'auth_request': [handleAuthRequest],
		'auth_answer': [handleAuthAnswer],
		'messages': [handleMessage],
		'questions': [handleQuestion],
		'user_joined': [handleUserJoined],
		'user_leaved': [handleUserLeaved],
		'down_question': [handleDownQuestions],
		'up_question': [handleUpQuestions]
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
	request.get(`https://52.212.178.211:3000/casts/token/${castId}`, function(err, res, body) {
		if (err) {
			console.error(err);
		} else {
			body = JSON.parse(body);
			this.castToken = body;
			this.wss = io("https://52.212.178.211:8443");

			this.wss.on('connect_error', function(err) {
				console.error(`Got an error: ${err}`);
			});

			this.wss.on('error', function(err) {
				console.error(`ERROR DETECTED: `, err);
			});

			this.wss.on('connect', function() {
				if (this.events['connect'].length) {
					_.forEach(this.events['connect'], (fn) => fn.bind(this)());
				}
			}.bind(this));

			this.wss.on('messages', function(message) {
				_.forEach(this.events['messages'], (fn) => fn.bind(this)(message));
			}.bind(this));

			this.wss.on('questions', function(question) {
				_.forEach(this.events['questions'], (fn) => fn.bind(this)(question));
			}.bind(this));

			this.wss.on('auth_request', function() {
				_.forEach(this.events['auth_request'], (fn) => fn.bind(this)());
			}.bind(this));

			this.wss.on('auth_answer', function() {
				_.forEach(this.events['auth_answer'], (fn) => fn.bind(this)());
			}.bind(this));

			this.wss.on('user_joined', function(user) {
				_.forEach(this.events['user_joined'], (fn) => fn.bind(this)(user));
			}.bind(this));

			this.wss.on('user_leaved', function(user) {
				_.forEach(this.events['user_joined'], (fn) => fn.bind(this)(user));
			}.bind(this));
		}
	}.bind(this));
}

SpredClient.prototype.on = function(eventName, fn) {
	if (!events[eventName]) {
		events[eventName].push(fn);
	}
}

SpredClient.prototype.sendMessage = function(text) {
	this.wss.emit('messages', {
		text: text
	});
}

SpredClient.prototype.askQuestion = function(text) {
	this.wss.emit('questions', {
		text: text
	});
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
		this.webRtcPeer.processAnswer(auth_answer.sdpAnswer);
		console.info("sdpAnswer received and processed : ", auth_answer.sdpAnswer);
	}
}

function handleMessages(message) {
	this.spredCast.messages.push(message);
}

function handleQuestions(question) {
	this.spredCast.questions.push(question);
}

function handleDownQuestions(question) {
	question = _.find(this.spredCast.questions, (q) => {
		return question.id === q.id;
	});
	question.downVote += 1;
}

function handleUpQuestions(question) {
	question = _.find(this.spredCast.questions, (q) => {
		return question.id === q.id;
	});
	question.upVote += 1;
}

function handleUserJoined(user) {
	this.spredCast.users.push(user);
}

function handleUserLeaved(user) {
	_.pull(this.spredCast.users, user);
}

module.exports = SpredClient;
