// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'

const PIPE = '|'
const SPACE = ' '

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let formattable = vscode.commands.registerCommand('nicegaugetables.formatTable', () => {
		// Get the active text editor
		let editor = vscode.window.activeTextEditor

		if (editor) {
			let document = editor.document
			let selection = editor.selection

			let selectedlines = new vscode.Range(selection.start.line, 0, selection.end.line + 1, 0)

			// split the selection into lines
			let lines: Array<String> = document.getText(selectedlines).split('\n')
			let counts: Array<number> = []
			// First calculate the maximum size of each column
			for (let line of lines) {
				if ((line.match(/\|/g) || []).length > 1) { // ignore lines that don't have at least two | characters
					// Add leading | if necessary
					if (line[0] !== PIPE) line = PIPE + line
					// Add trailing | if necessary, starting by trimming trailing spaces
					line = line.trim()
					if (line[line.length - 1] != PIPE) line = line + PIPE
					let segments = line.split(PIPE)
					segments.shift() // As the first character is a |, the first segment is always empty TODO verify first character
					segments.pop() // As the last character is a |, the first segment is always empty TODO verify last character
					if (segments) {
						for (let i = 0; i < segments.length; i++) {
							if (i < counts.length) {
								counts[i] = Math.max(counts[i], segments[i].trim().length)
							} else {
								counts.push(segments[i].trim().length)
							}
						}
					}
				}
			}
			// Then, padd each column of each line to the maximum size
			let result = ''
			for (let line of lines) {
				if ((line.match(/\|/g) || []).length > 1) { // ignore lines that don't have at least two | characters
					// Add leading | if necessary
					if (line[0] !== PIPE) line = PIPE + line
					// Add trailing | if necessary, starting by trimming trailing spaces
					line = line.trim()
					if (line[line.length - 1] != PIPE) line = line + PIPE
					let segments = line.split(PIPE)
					segments.shift()
					segments.pop()
					let linepadding = SPACE
					if (segments.every(seg => seg === segments[0][0].repeat(seg.length))) linepadding = segments[0][0]
					for (let i = 0; i < segments.length; i++) {
						let padding = SPACE
						if (segments[i] === segments[i][0].repeat(segments[i].length)) {
							padding = segments[i][0]
						}
						segments[i] = padding + segments[i].trim() + padding.repeat(counts[i] - segments[i].trim().length) + padding
					}
					if (segments.length < counts.length) {
						// complete incomplete lines
						for (let j = segments.length; j < counts.length; j++) {
							segments.push(linepadding.repeat(counts[j] + 2)) // +2 to account for added spaces
						}
					}
					line = PIPE + segments.join(PIPE) + PIPE
				}
				result = result + line + '\n'
			}
			editor.edit(editBuilder => {
				editBuilder.replace(selectedlines, result.slice(0, -1)) // removing the unnecessray trailing newline
			})
		}
	})
	context.subscriptions.push(formattable)

	let createtable = vscode.commands.registerCommand('nicegaugetables.createTable', () => {
		let editor = vscode.window.activeTextEditor

		if (editor) {
			let document = editor.document
			let selection = editor.selection

			vscode.window.showInputBox({ prompt: 'Number of columns' }).then(inputcols => {
				// check that value entered is a number
				let nbcols = parseInt(inputcols || '', 10)
				if (!isNaN(nbcols)) {
					vscode.window.showInputBox({ prompt: 'Number of lines' }).then(inputlines => {
						// check that value entered is a number
						let nblines = parseInt(inputlines || '', 10)
						if (!isNaN(nblines)) {
							let result = ''
							// First create header line
							result = '|     '.repeat(nbcols) + PIPE + '\n'
							// Then add separator line
							result += '|-----'.repeat(nbcols) + PIPE + '\n'
							// Then add lines
							result += ('|     '.repeat(nbcols) + PIPE + '\n').repeat(nblines)
							result += '\n'
							if (editor) {
								editor.edit(editBuilder => {
									editBuilder.insert(new vscode.Position(selection.start.line + 1, 0), result)
								})
								editor.selection = new vscode.Selection(new vscode.Position(selection.start.line, 2), new vscode.Position(selection.start.line, 2))
							}
						}
					})
				}
			})
		}
	})
	context.subscriptions.push(createtable)

}

// this method is called when your extension is deactivated
export function deactivate() { }
