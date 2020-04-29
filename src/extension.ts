// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('nicegaugetables.formatTable', () => {
		// Get the active text editor
		let editor = vscode.window.activeTextEditor;

		if (editor) {
			let document = editor.document;
			let selection = editor.selection;

			let selectedlines = new vscode.Range(selection.start.line, 0, selection.end.line + 1, 0)

			// split the selection into lines
			let lines: Array<String> = document.getText(selectedlines).split('\n');
			let counts: Array<number> = []
			// First calculate the maximum size of each column
			for (let line of lines) {
				if ((line.match(/\|/g) || []).length > 1) { // ignore lines that don't have at least two | characters
					let segments = line.split('|')
					for (let i = 0; i < segments.length; i ++) {
						if (i < counts.length) {
							counts[i] = Math.max(counts[i], segments[i].length)
						} else {
							counts.push(segments[i].length)
						}
					}
				}
			}
			// Then, padd each column of each line to the maximum size
			let result = ''
			for (let line of lines) {
				if ((line.match(/\|/g) || []).length > 1) { // ignore lines that don't have at least two | characters
					let segments = line.split('|')
					for (let i = 0; i < segments.length; i ++) {
						segments[i] = segments[i] + " ".repeat(counts[i] - segments[i].length)
					}
					line = segments.join('|')
				}
				result = result + line
			}
			editor.edit(editBuilder => {
				editBuilder.replace(selectedlines, result);
			});
		}
	});

	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }
