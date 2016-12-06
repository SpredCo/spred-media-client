var Question = function(id, text, wss) {
	this.text = text;
	this.upVote = 0;
	this.downVote = 0;
	this.up = function() {
		wss.emit('up_question', {
			id: id
		});
	};
	this.down = function() {
		wss.emit('down_question', {
			id: id
		});
	}
	return this;
}

module.exports = Question;
