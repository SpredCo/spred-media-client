var io = require('socket.io-client');

var Room = function(id, castToken) {
	this.id = id;
	this.users = null;
	this.wss = null;
	this.webRtcPeer = null;
	this.video = document.getElementById('video');
	this.castToken = castToken;

	this.events = {
		'success_join': 'connect'
	}
};

Room.prototype.join = function() {
	this.wss = io('wss://52.212.178.211:8443').on('connect', function() {
		this.wss.on('auth_request', function() {
			// CALL API FOR CAST_TOKEN
			this.wss.emit('auth_answer', {
				id: this.id,
				cast_token: this.castToken
			});
		}.bind(this));
	}.bind(this));
}

Room.prototype.leave = function() {
	if (this.webRtcPeer) {
		this.webRtcPeer.dispose();
		this.webRtcPeer = null;
	}
	this.wss.disconnect();
}

Room.prototype.present = function() {
	if (!this.webRtcPeer) {

		var wss = this.wss;

		var options = {
			localVideo: this.video,
			onicecandidate: function(candidate) {
				console.info("Got a candidate : ", candidate);
				wss.emit('ice_candidate', {
					candidate: candidate
				});
			}
		}

		this.wss.on('ice_candidate', function(ice_candidate) {
			console.info('IceCandidate received from server : ', ice_candidate);
			this.webRtcPeer.addIceCandidate(ice_candidate.candidate);
		}.bind(this));

		this.wss.on('presenter_answer', function(presenter_answer) {
			if (presenter_answer.response != 'accepted') {
				var errorMsg = presenter_answer.message ? presenter_answer.message : 'Unknow error';
				console.warn('Call not accepted for the following reason: ');
				console.warn(errorMsg);
				this.leave();
			} else {
				this.webRtcPeer.processAnswer(presenter_answer.sdpAnswer);
				console.info("Presenter request received and processed : ", presenter_answer.sdpAnswer);
			}
		}.bind(this));

		this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerSendonly(options, function(error) {
			if (error) return console.error(error);

			this.generateOffer(function(error, offerSdp) {
				if (error) return console.error(error);

				wss.emit('presenter_request', {
					sdpOffer: offerSdp
				});
				console.info("An sdpOffer has been sent : ", offerSdp);
			});
		});
	}
}

Room.prototype.spectate = function() {
	if (!this.webRtcPeer) {

		var wss = this.wss;

		var options = {
			remoteVideo: this.video,
			onicecandidate: function(candidate) {
				console.info("Got a candidate : ", candidate);
				wss.emit('ice_candidate', {
					candidate: candidate
				});
			}
		}

		this.wss.on('ice_candidate', function(ice_candidate) {
			console.info('IceCandidate received from server : ', ice_candidate);
			this.webRtcPeer.addIceCandidate(ice_candidate.candidate);
		}.bind(this));

		this.wss.on('viewer_answer', function(viewer_answer) {
			if (viewer_answer.response != 'accepted') {
				var errorMsg = viewer_answer.message ? viewer_answer.message : 'Unknow error';
				console.warn('Call not accepted for the following reason: ' + errorMsg);
				this.leave();
			} else {
				this.webRtcPeer.processAnswer(viewer_answer.sdpAnswer);
				console.info("Presenter request received and processed : ", presenter_answer.sdpAnswer);
			}
		}.bind(this));

		this.webRtcPeer = kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
			if (error) return console.error(error);

			this.generateOffer(function(error, offerSdp) {
				if (error) return console.error(error)

				wss.emit('viewer_request', {
					sdpOffer: offerSdp
				});
				console.info("An sdpOffer has been sent : ", offerSdp);
			});
		});
	}
}

Room.prototype.on = function(event, fn) {
	if (!this.wss) {
		console.log("You have to join a Room before managing event");
		return;
	}

	this.wss.on(this.events[event], fn);
}

module.exports = Room;
