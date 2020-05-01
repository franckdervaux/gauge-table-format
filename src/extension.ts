// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'

const PIPE = '|'
const SPACE = ' '
const TABLELINE = new RegExp(/^(\|.*?)+\|(\ )*$/gm)

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

			// does nothing if the current line is not a table line
			if (!document.lineAt(selection.start.line).text.match(TABLELINE)) return

			// look for lines that make up the table
			// starting from the cursor position
			// and going up
			let firstline = selection.start.line
			let lastline = selection.start.line
			while (document.lineAt(firstline).text.match(TABLELINE)) {
				firstline--
			}
			while (document.lineAt(lastline).text.match(TABLELINE)) {
				lastline++
			}
			let lines: Array<String> = []
			for (let i = firstline + 1; i < lastline; i++) {
				lines.push(document.lineAt(i).text)
			}
			let tablerange = new vscode.Range(new vscode.Position(firstline + 1, 0), new vscode.Position(lastline, 0))
			let counts: Array<number> = []
			// First calculate the maximum size of each column
			for (let line of lines) {
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
				editBuilder.replace(tablerange, result)
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
