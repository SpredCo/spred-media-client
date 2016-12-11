const _ = require('lodash');

const Question = function(id, wss) {
	this.id = id;
	this.text = null;
	this.sender = null;
	this.upVote = 0;
	this.downVote = 0;
	this.up = () => {
		this.upVote += 1;
		const payload = _.reject(this, ['id', 'text', 'sender', 'upVote', 'downVote']);
		wss.emit('up_question', payload);
	};
	this.down = () => {
		this.downVote += 1;
		const payload = _.reject(this, ['id', 'text', 'sender', 'upVote', 'downVote']);
		wss.emit('down_question', payload);
	}
	return this;
}

module.exports = Question;
