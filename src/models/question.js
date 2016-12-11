const _ = require('lodash');

const Question = function(id, wss) {
	this.id = id;
	this.text = null;
	this.sender = null;
	this.upVote = 0;
	this.downVote = 0;
	this.up = () => {
		wss.emit('up_question', {
			id: this.id
		});
	};
	this.down = () => {
		wss.emit('down_question', {
			id: this.id
		});
	}
	return this;
}

module.exports = Question;
