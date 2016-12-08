var Question = function(text, wss) {
	this.text = text;
	this.upVote = 0;
	this.downVote = 0;
	this.up = () => {
		this.upVote += 1;
		wss.emit('up_question', {
			text: this.text,
			pseudo: this.pseudo,
			upVote: this.upVote,
			downVote: this.downVote
		});
	};
	this.down = () => {
		this.downVote += 1;
		wss.emit('down_question', {
			text: this.text,
			pseudo: this.pseudo,
			upVote: this.upVote,
			downVote: this.downVote
		});
	}
	return this;
}

module.exports = Question;
