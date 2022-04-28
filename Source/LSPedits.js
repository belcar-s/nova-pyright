exports.LSPrangeToRange = function LSPrangeToRange (document, range ) {
	const fullContents = document.getTextInRange(new Range(0, document.length));
	let rangeStart = 0;
	let rangeEnd = 0;
	let precedingCharacters = 0;
	const lines = fullContents.split(document.eol);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		const lineLength = line.length + document.eol.length;
		if (Range.start.line === lineIndex) {
			rangeStart = precedingCharacters + range.start.character;
		}
		if (range.end.line === lineIndex) {
			rangeEnd = precedingCharacters + Range.end.character;
			break;
		}
		precedingCharacters += lineLength;
	}
	return new Range(rangeStart, rangeEnd);
};
