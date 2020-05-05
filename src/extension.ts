// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

const PIPE = '|'
const SPACE = ' '
const DASH = '-'
const TABLELINE = new RegExp(/^(\|.*?)+\|(\ )*$/gm)

let latestEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor

const detectTable = (document: vscode.TextDocument, from: vscode.Position): { firstline: number, lastline: number } => {
	// does nothing if the current line is not a table line
	if (!document.lineAt(from.line).text.match(TABLELINE)) return { firstline: -1, lastline: -1 }

	// look for lines that make up the table
	// starting from the cursor position
	// and going up
	let firstline = from.line
	let lastline = from.line
	while ((firstline >= 0) && document.lineAt(firstline).text.match(TABLELINE)) {
		firstline--
	}
	while ((lastline < document.lineCount) && document.lineAt(lastline).text.match(TABLELINE)) {
		lastline++
	}

	return { firstline: firstline + 1, lastline: lastline - 1 }
}

const createTable = (nbcols: number, nblines: number, editor: vscode.TextEditor | undefined) => {
	if (editor) {
		let selection = editor.selection

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
}

const readAndSetHtmlToWebview = (webview: vscode.Webview, extensionPath: string) => {
	const htmlPath = path.join(extensionPath, 'media', 'panel.html')

	const iconsPath = webview.asWebviewUri(vscode.Uri.file(
		path.join(extensionPath, 'media')
	))

	fs.readFile(htmlPath, 'utf8', (err, data) => {
		if (err) throw err
		webview.html = eval('`' + data + '`')
	})
}

const formatTable = (editor: vscode.TextEditor | undefined) => {
	if (editor) {
		let document = editor.document
		let selection = editor.selection

		// look for lines that make up the table
		let { firstline, lastline } = detectTable(document, selection.start)
		if (firstline < 0) return // notable found

		let lines: Array<String> = []
		for (let i = firstline; i <= lastline; i++) {
			lines.push(document.lineAt(i).text)
		}
		let tablerange = new vscode.Range(new vscode.Position(firstline, 0), new vscode.Position(lastline, document.lineAt(lastline).range.end.character))
		let counts: Array<number> = []
		// First calculate the maximum size of each column
		for (let line of lines) {
			// Add leading | if necessary
			if (line[0] !== PIPE) line = PIPE + line
			// Add trailing | if necessary, starting by trimming trailing spaces
			line = line.trim()
			if (line[line.length - 1] != PIPE) line = line + PIPE
			let segments = line.split(PIPE)
			segments.shift() // As the first character is a |, the first segment is always empty
			segments.pop() // As the last character is a |, the first segment is always empty
			let separator = segments.every(seg => seg === segments[0][0].repeat(seg.length))
			if (segments && !separator) {
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
				let padding = SPACE
				if (segments.every(seg => seg === segments[0][0].repeat(seg.length))) {
					padding = segments[0][0]
					for (let i = 0; i < segments.length; i++) {
						segments[i] = padding.repeat(counts[i] + 2)
					}
				} else {
					for (let i = 0; i < segments.length; i++) {
						segments[i] = padding + segments[i].trim() + padding.repeat(counts[i] - segments[i].trim().length) + padding
					}
				}
				if (segments.length < counts.length) {
					// complete incomplete lines
					for (let j = segments.length; j < counts.length; j++) {
						segments.push(padding.repeat(counts[j] + 2)) // +2 to account for added spaces
					}
				}
				line = PIPE + segments.join(PIPE) + PIPE
			}
			result = result + line + '\n'
		}
		editor.edit(editBuilder => {
			editBuilder.replace(tablerange, result.substr(0, result.length - 1))
		})
	}
}

const deleteTable = (editor: vscode.TextEditor | undefined) => {
	if (editor) {
		let document = editor.document
		let selection = editor.selection

		let { firstline, lastline } = detectTable(document, selection.start)
		if (firstline < 0) return // no table found

		editor.edit(editBuilder => {
			editBuilder.replace(new vscode.Range(firstline, 0, lastline, document.lineAt(lastline).range.end.character), '')
		})
	}
}

const deleteColumn = (editor: vscode.TextEditor | undefined) => {
	if (editor) {
		let document = editor.document
		let selection = editor.selection

		let { firstline, lastline } = detectTable(document, selection.start)
		if (firstline < 0) return // no table found

		let lines: Array<String> = []
		for (let i = firstline; i <= lastline; i++) {
			lines.push(document.lineAt(i).text)
		}
		let tablerange = new vscode.Range(new vscode.Position(firstline, 0), new vscode.Position(lastline, document.lineAt(lastline).range.end.character))

		// calculate column of the cursor
		let columnindex = document.lineAt(selection.start.line).text.substring(0, selection.start.character).match(/\|/g)?.length
		if (columnindex === undefined) return
		columnindex--

		// remove the column in each line
		let result = ''
		for (let line of lines) {
			let segments = line.split(PIPE)
			segments.shift()
			result += PIPE + segments.filter((seg, segindex) => segindex != columnindex).join(PIPE) + '\n'
		}
		// remove trailing /n
		result = result.substr(0, result.length - 1)
		editor.edit(editBuilder => {
			editBuilder.replace(tablerange, result)
		})
	}
}

const appendColumn = (editor: vscode.TextEditor | undefined) => {
	if (editor) {
		let document = editor.document
		let selection = editor.selection

		let { firstline, lastline } = detectTable(document, selection.start)
		if (firstline < 0) return // no table found

		let lines: Array<String> = []
		for (let i = firstline; i <= lastline; i++) {
			lines.push(document.lineAt(i).text)
		}
		let tablerange = new vscode.Range(new vscode.Position(firstline, 0), new vscode.Position(lastline, document.lineAt(lastline).range.end.character))

		// calculate column of the cursor
		let columnindex = document.lineAt(selection.start.line).text.substring(0, selection.start.character).match(/\|/g)?.length
		if (columnindex === undefined) return

		// add the column in each line
		let result = ''
		let cursorindex = 0
		for (let line of lines) {
			let segments = line.split(PIPE)
			segments.shift()
			let separator = segments.every(seg => seg === segments[0][0].repeat(seg.length))
			let padding = separator ? DASH : SPACE
			segments.splice(columnindex, 0, padding.repeat(5))
			result += PIPE + segments.join(PIPE) + '\n'
			cursorindex = (PIPE + segments.slice(0, columnindex).join(PIPE)).length + 2
		}
		// remove trailing /n
		result = result.substr(0, result.length - 1)
		editor.edit(editBuilder => {
			editBuilder.replace(tablerange, result)
		})

		// position cursor at the beginning of the new column
		let newPosition = new vscode.Position(selection.start.line, cursorindex)
        let newSelection = new vscode.Selection(newPosition, newPosition)
        editor.selection = newSelection
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let formattablecommand = vscode.commands.registerCommand('nicegaugetables.formatTable', () => {
		formatTable(vscode.window.activeTextEditor)
	})
	context.subscriptions.push(formattablecommand)

	let createtablecommand = vscode.commands.registerCommand('nicegaugetables.createTable', () => {
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
							createTable(nbcols, nblines, editor)
						}
					})
				}
			})
		}
	})
	context.subscriptions.push(createtablecommand)

	let deletetablecommand = vscode.commands.registerCommand('nicegaugetables.deleteTable', () => {
		deleteTable(vscode.window.activeTextEditor)
	})
	context.subscriptions.push(deletetablecommand)

	let deletecolumncommand = vscode.commands.registerCommand('nicegaugetables.deleteColumn', () => {
		deleteColumn(vscode.window.activeTextEditor)
	})
	context.subscriptions.push(deletecolumncommand)

	let viewpanelcommand = vscode.commands.registerCommand('nicegaugetables.viewPanel', () => {
		// Create and show a new webview
		const panel = vscode.window.createWebviewPanel(
			'tablePanel', // Identifies the type of the webview. Used internally
			'Manage Tables', // Title of the panel displayed to the user
			vscode.ViewColumn.Beside, // Editor column to show the new webview panel in.
			{
				enableScripts: true,
				localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'media'))]
			}
		)
		panel.iconPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'panelicon.png'))

		readAndSetHtmlToWebview(panel.webview, context.extensionPath)
	
		panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'formattable':
						formatTable(latestEditor)
						return
					case 'createtable':
						if ((message.nbcols > 0) && (message.nbrows > 0)) {
							createTable(message.nbcols, message.nbrows, latestEditor)
						}
						return
					case 'deletetable':
						deleteTable(latestEditor)
						return
					case 'deletecolumn':
						deleteColumn(latestEditor)
						return
					case 'appendcolumn':
						appendColumn(latestEditor)
						return
				}
			},
			undefined,
			context.subscriptions
		);


	})
	context.subscriptions.push(viewpanelcommand)

	latestEditor = vscode.window.activeTextEditor

	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) latestEditor = editor
	})
}


// this method is called when your extension is deactivated
export function deactivate() { }
