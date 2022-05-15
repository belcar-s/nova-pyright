import * as LSP from "vscode-languageserver-types";

export function applyLSPedits(
	editor: TextEditor,
	edits: Array<LSP.TextEdit>,
) {
	return editor.edit((textEditorEdit) => {
		for (const change of edits.reverse()) {
			const range = LSPrangeToRange(editor.document, change.range);
			textEditorEdit.replace(range, change.newText);
		}
	});
}

export async function applyWorkspaceEdit(
	workspaceEdit: LSP.WorkspaceEdit,
) {
	if (workspaceEdit.documentChanges) {
	// look for the newer documentChanges property first
		for (const change of workspaceEdit.documentChanges || []) {
			// TODO: support Create, Rename, Delete
			if (!("edits" in change)) {
				continue;
			}
			if ("edits" in change && change.edits.length === 0) {
				continue;
			}

			const editor = await nova.workspace.openFile(change.textDocument.uri);
			if (!editor) {
				nova.workspace.showWarningMessage(
					`Failed to open ${change.textDocument.uri}.`,
				);
				continue;
			}

			return applyLSPedits(editor, change.edits);
		}
	} else if (workspaceEdit.changes) {
		for (const uri in workspaceEdit.changes) {
			const changes = workspaceEdit.changes[uri];
			if (!changes.length) {
				continue;
			}
			const editor = await nova.workspace.openFile(uri);
			if (!editor) {
				nova.workspace.showWarningMessage(`Failed to open ${uri}.`);
				continue;
			}

			return applyLSPedits(editor, changes);
		}
	}
}

export function LSPrangeToRange (document: TextDocument, range: LSP.Range) {
	const fullContents = document.getTextInRange(new Range(0, document.length));
	let rangeStart = 0;
	let rangeEnd = 0;
	let precedingCharacters = 0;
	const lines = fullContents.split(document.eol);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const line = lines[lineIndex];
		const lineLength = line.length + document.eol.length;
		if (range.start.line === lineIndex) {
			rangeStart = precedingCharacters + range.start.character;
		}
		if (range.end.line === lineIndex) {
			rangeEnd = precedingCharacters + range.end.character;
			break;
		}
		precedingCharacters += lineLength;
	}
	return new Range(rangeStart, rangeEnd);
}

export function rangeToLSPrange(
	document: TextDocument,
	range: Range,
): LSP.Range | null {
	const fullContents = document.getTextInRange(new Range(0, document.length));
	let precedingCharacters = 0;
	let startLSPrange: LSP.Position | undefined;
	const lines = fullContents.split(document.eol);
	for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
		const lineLength = lines[lineIndex].length + document.eol.length;
		if (!startLSPrange && precedingCharacters + lineLength >= range.start) {
			const character = range.start - precedingCharacters;
			startLSPrange = { line: lineIndex, character };
		}
		if (startLSPrange && precedingCharacters + lineLength >= range.end) {
			const character = range.end - precedingCharacters;
			return { start: startLSPrange, end: { line: lineIndex, character } };
		}
		precedingCharacters += lineLength;
	}
	return null;
}
