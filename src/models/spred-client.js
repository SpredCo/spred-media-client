const io = require('socket.io-client');
const _ = require('lodash');
const kurentoUtils = require('kurento-utils');
const request = require('request');
const notifyjs = require('notifyjs');

const SpredCast = require('./spredcast');
const Message = require('./message');
const Question = require('./question');

const SpredClient = function() {
	if (notifyjs.default.needsPermission && notifyjs.default.isSupported()) {
		notifyjs.default.requestPermission(() => {}, () => alert("Access denied"));
	}
	this.wss = null;
	this.webRtcPeer = null;
	this.video = document.getElementById('video');
	this.allowedSource = ['screen', 'webcam', 'window'];
	this.defaultSource = 'webcam';
	this.spredCast = new SpredCast();
	this.user = null;
	this.events = {
		'connect': [],
		'auth_request': [handleAuthRequest],
		'auth_answer': [handleAuthAnswer],
		'messages': [handleMessages],
		'questions': [handleQuestions, sortQuestions],
		'down_question': [handleVotedQuestions, sortQuestions],
		'up_question': [handleVotedQuestions, sortQuestions],
		'disconnect': [],
		'cast_starting': [],
		'cast_terminated': [this.quit, this.close],
		'reload_cast': [reloadCast],
		'ready': [],
		'user_joined': [],
		'user_left': [],
		'error': [],
		'presenter_left': []
	};
};

SpredClient.prototype.close = function() {
	if (this.wss) {
		this.wss.disconnect();
	}
}

SpredClient.prototype.quit = function() {
	if (this.webRtcPeer) {
		if (this.castToken && this.castToken.presenter) this.wss.emit('terminate_cast');
		this.webRtcPeer.dispose();
		this.webRtcPeer = null;
	}
}

SpredClient.prototype.connect = function(keys) {
	if (!keys.castToken) {
		const WEB_APP_URI = (typeof process.env.WEB_APP_URI === "string") ? process.env.WEB_APP_URI : 'https://localhost:3000';
		request.get(`${WEB_APP_URI}/casts/token/${keys.castId}`, function(err, res, body) {
			if (err) {
				console.error(err);
			} else {
				body = JSON.parse(body);
				this.castToken = body;
				this.isPresenter = this.castToken.presenter;
				_.forEach(this.events['ready'], (fn) => fn.bind(this)());
			}
		}.bind(this));
	} else {
		this.castToken = {
			cast_token: keys.castToken
		};
		_.forEach(this.events['ready'], (fn) => fn.bind(this)());
	}
}

SpredClient.prototype.start = function() {
	if (this.castToken) {
		etablishMediaServiceConnection.bind(this)();
	}
}

SpredClient.prototype.on = function(eventName, fn) {
	if (this.events[eventName]) {
		this.events[eventName].push(fn);
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

SpredClient.prototype.setSource = function(source) {
	if (_.includes(this.allowedSource, source)) {
		if (source !== this.source && this.webRtcPeer) {
			this.source = source;
			reloadCast.bind(this)();
		} else {
			this.source = source;
		}
	}
}

SpredClient.prototype.sendNotification = function(object) {
	if (!notifyjs.default.needsPermission && this.user && object.sender !== this.user) {
		if (object.hasOwnProperty("nbVote")) {
			var myNotification = new notifyjs.default(`New question from @${object.sender}`, {
				body: object.text,
				timeout: 3
			});
		} else {
			var myNotification = new notifyjs.default(`New message from @${object.sender}`, {
				body: object.text,
				timeout: 3
			});
		}
		myNotification.show();
	}
}

function etablishMediaServiceConnection(token) {
	const MEDIA_SERVICE_URI = (typeof process.env.MEDIA_SERVICE_URI === "string") ? process.env.MEDIA_SERVICE_URI : 'https://localhost:8443/';
	this.wss = io(MEDIA_SERVICE_URI);

	this.wss.on('connect_error', function(err) {
		console.error(`Got an error: ${err}`);
	});

	this.wss.on('error', function(err) {
		console.error(`ERROR DETECTED: `, err);
	});

	_.forEach(Object.keys(this.events), (e) => {
		this.wss.on(e, function(data) {
			_.forEach(this.events[e], (fn) => fn.bind(this)(data));
		}.bind(this));
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
		options.sendSource = this.source;
		options.mediaConstraints = {
			audio: true,
			video: {
				width: 1280,
				framerate: 24
			}
		};
		this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, sendAuthRequest);
	} else {
		options.remoteVideo = this.video;
		this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, sendAuthRequest);
	}
}

function handleAuthAnswer(auth_answer) {
	if (auth_answer.status != 'accepted') {
		var errorMsg = error.message ? error.message : 'Unknow error';
		_.forEach(this.events['error'], (fn) => fn.bind(this)(errorMsg));
		console.warn('Call not accepted for the following reason: ');
		console.warn(errorMsg);
		this.quit();
	} else {
		this.user = auth_answer.user;
		this.spredCast.id = auth_answer.spredCastId;
		this.webRtcPeer.processAnswer(auth_answer.sdpAnswer);
		console.info("sdpAnswer received and processed : ", auth_answer.sdpAnswer);
		this.wss.emit('messages', {
			text: ` joined the chat.`
		});
	}
}

function handleMessages(message) {
	this.spredCast.messages.push(message);
}

function handleQuestions(question) {
	question.date = new Date(question.date);
	const newQuestion = new Question(question.id, this.wss);
	newQuestion.sender = question.sender;
	newQuestion.text = question.text;
	newQuestion.date = question.date;
	newQuestion.user_picture = question.user_picture;
	newQuestion.nbVote = question.nbVote;
	newQuestion.alreadyVoted = question.alreadyVoted;
	this.spredCast.questions.push(newQuestion);
}

function handleVotedQuestions(question) {
	const q = _.find(this.spredCast.questions, function(q) {
		return q.id === question.id;
	});
	if (q) {
		q.nbVote = question.nbVote;
	}
}

function sortQuestions() {
	this.spredCast.questions.sort(function(a, b) {
		return b.nbVote - a.nbVote;
	});
}

function reloadCast() {
	handleAuthRequest.bind(this)();
}

module.exports = SpredClient;
