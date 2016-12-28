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
		notifyjs.default.requestPermission(() => alert("Access granted"), () => alert("Access denied"));
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
		'questions': [handleQuestions],
		'down_question': [handleDownQuestions],
		'up_question': [handleUpQuestions]
	};
};

SpredClient.prototype.disconnect = function() {
	if (this.webRtcPeer) {
		this.webRtcPeer.dispose();
		this.webRtcPeer = null;
	}
	this.wss.disconnect();
}

SpredClient.prototype.connect = function(keys) {
	if (!keys.castToken) {
		request.get(`http://localhost:8080/casts/token/${keys.castId}`, function(err, res, body) {
			if (err) {
				console.error(err);
			} else {
				body = JSON.parse(body);
				this.castToken = body;
				etablishMediaServiceConnection.bind(this)();
			}
		}.bind(this));
	} else {
		this.castToken = {
			cast_token: keys.castToken
		};
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
	if (_.includes(['webcam', 'screen', 'window'], source)) {
		this.source = source;
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
	this.wss = io("http://localhost:3030/");

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
		while (this.allowedSource.includes(this.source = window.prompt(`Quelles sources souhaitez-vous diffuser ? Choix : ${this.allowedSource.join(',')}`, this.defaultSource)) === false);
		options.localVideo = this.video;
		options.sendSource = this.source;
		options.mediaConstraints = {
			audio: true,
			video: true
		};
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
		this.user = auth_answer.user;
		this.wss.emit('messages', {
			text: ` joined the chat.`
		});
		if (!auth_answer.sdpAnswer) {
			this.sendNotification({
				sender: 'Spred Media Service',
				text: auth_answer.message
			});
		} else {
			this.webRtcPeer.processAnswer(auth_answer.sdpAnswer);
			console.info("sdpAnswer received and processed : ", auth_answer.sdpAnswer);
		}
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
	this.spredCast.questions.push(newQuestion);
}

function handleDownQuestions(question) {
	const questionToDown = _.find(this.spredCast.questions, function(q) {
		return q.id === question.id;
	});

	questionToDown.nbVote = question.nbVote;
}

function handleUpQuestions(question) {
	const questionToUp = _.find(this.spredCast.questions, function(q) {
		return q.id === question.id;
	});

	questionToUp.nbVote = question.nbVote;
}

module.exports = SpredClient;
