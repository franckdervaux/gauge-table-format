// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

import { PIPE, SPACE, TABLELINE, formatSegments, buildResultString } from './utils'

const DEFAULTCOLWIDTH = 5
let latestEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor

let configuration: vscode.WorkspaceConfiguration

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

		let segments = new Array<Array<string>>(nblines  + 2)
		// First create header line
		let emptycol = SPACE.repeat(DEFAULTCOLWIDTH)
		let emptyline= new Array<string>(nbcols)
		emptyline.fill(emptycol, 0)
		segments[0] = emptyline

		// Then add separator line
		let sepcol = configuration.headerRowsCharacter.repeat(DEFAULTCOLWIDTH)
		let separatorline = new Array<string>(nbcols)
		separatorline.fill(sepcol, 0)
		segments[1] = separatorline

		// Then add lines
		segments.fill(emptyline, 2)
		editor.edit(editBuilder => {
			editBuilder.insert(new vscode.Position(selection.start.line + 1, 0), buildResultString(segments, false))
		})
		editor.selection = new vscode.Selection(new vscode.Position(selection.start.line, 2), new vscode.Position(selection.start.line, 2))
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

		let { segments, counts } = prepareFormatTable(editor, firstline, lastline)
		let result = ''
		for (let seg of segments) {
			result += PIPE + seg.join(PIPE) + PIPE + '\n'
		}
		let tablerange = new vscode.Range(new vscode.Position(firstline, 0), new vscode.Position(lastline, document.lineAt(lastline).range.end.character))
		editor.edit(editBuilder => {
			editBuilder.replace(tablerange, result.substr(0, result.length - 1))
		})
	}
}

const prepareFormatTable = (editor: vscode.TextEditor, firstline: number, lastline: number): { segments: Array<Array<string>>, counts: Array<number> } => {
	let document = editor.document

	let lines: Array<String> = []
	for (let i = firstline; i <= lastline; i++) {
		lines.push(document.lineAt(i).text)
	}
	let { result, counts } = formatSegments(lines)

	return { segments: result, counts }
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

		// To properly delete a column, the table must be properly formatted first
		let { segments, counts } = prepareFormatTable(editor, firstline, lastline)
		// Delete table if empty
		if (segments.every(seg => seg.length === 1)) deleteTable(editor)

		// calculate column of the cursor
		let columnindex = document.lineAt(selection.start.line).text.substring(0, selection.start.character).match(/\|/g)?.length
		if (columnindex === undefined) return
		columnindex--

		// remove the column in each line
		for (let seg of segments) {
			seg.splice(columnindex, 1)
		}
		let tablerange = new vscode.Range(new vscode.Position(firstline, 0), new vscode.Position(lastline, document.lineAt(lastline).range.end.character))
		editor.edit(editBuilder => {
			editBuilder.replace(tablerange, buildResultString(segments))
		})
	}
}

const appendColumn = (editor: vscode.TextEditor | undefined) => {
	if (editor) {
		let document = editor.document
		let selection = editor.selection

		let { firstline, lastline } = detectTable(document, selection.start)
		if (firstline < 0) return // no table found

		// To properly delete a column, the table must be properly formatted first
		let { segments } = prepareFormatTable(editor, firstline, lastline)

		let lines: Array<String> = []
		for (let i = firstline; i <= lastline; i++) {
			lines.push(document.lineAt(i).text)
		}
		let tablerange = new vscode.Range(new vscode.Position(firstline, 0), new vscode.Position(lastline, document.lineAt(lastline).range.end.character))

		// calculate column of the cursor
		let columnindex = document.lineAt(selection.start.line).text.substring(0, selection.start.character).match(/\|/g)?.length
		if (columnindex === undefined) return

		// add the column in each line
		let cursorindex = 0
		for (let seg of segments) {
			let separator = seg.every(curr => curr === seg[0][0].repeat(curr.length))
			let padding = separator ? seg[0][0] : SPACE
			seg.splice(columnindex, 0, padding.repeat(5))
			cursorindex = (PIPE + seg.slice(0, columnindex).join(PIPE)).length + 2
		}
		editor.edit(editBuilder => {
			editBuilder.replace(tablerange, buildResultString(segments))
		})

		// position cursor at the beginning of the new column
		let newPosition = new vscode.Position(selection.start.line, cursorindex)
		let newSelection = new vscode.Selection(newPosition, newPosition)
		editor.selection = newSelection
	}
}

const appendRow = (editor: vscode.TextEditor | undefined) => {
	if (editor) {
		let document = editor.document
		let selection = editor.selection

		let { firstline, lastline } = detectTable(document, selection.start)
		if (firstline < 0) return // no table found

		// To properly delete a column, the table must be properly formatted first
		let { segments, counts } = prepareFormatTable(editor, firstline, lastline)

		let tablerange = new vscode.Range(new vscode.Position(firstline, 0), new vscode.Position(lastline, document.lineAt(lastline).range.end.character))

		// calculate row of the cursor
		let cursorindex = selection.start.line - firstline
		// create empty row to be inserted
		let addition = counts.map(count => SPACE.repeat(count + 2))
		segments.splice(cursorindex + 1, 0, addition)
		editor.edit(editBuilder => {
			editBuilder.replace(tablerange, buildResultString(segments))
		})

		// position cursor at the beginning of the new column
		let newPosition = new vscode.Position(selection.start.line + 1, 1)
		let newSelection = new vscode.Selection(newPosition, newPosition)
		editor.selection = newSelection
	}
}

const deleteEmptyRows = (editor: vscode.TextEditor | undefined) => {
	if (editor) {
		let document = editor.document
		let selection = editor.selection

		let { firstline, lastline } = detectTable(document, selection.start)
		if (firstline < 0) return // no table found

		// To properly delete rows, the table must be properly formatted first
		let { segments, counts } = prepareFormatTable(editor, firstline, lastline)

		let tablerange = new vscode.Range(new vscode.Position(firstline, 0), new vscode.Position(lastline, document.lineAt(lastline).range.end.character))

		editor.edit(editBuilder => {
			editBuilder.replace(tablerange, buildResultString(segments))
		})
	}
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	configuration = vscode.workspace.getConfiguration('nicegaugetables')

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

	let appendcolumncommand = vscode.commands.registerCommand('nicegaugetables.appendColumn', () => {
		appendColumn(vscode.window.activeTextEditor)
	})
	context.subscriptions.push(appendcolumncommand)

	let appendrowcommand = vscode.commands.registerCommand('nicegaugetables.appendRow', () => {
		appendRow(vscode.window.activeTextEditor)
	})
	context.subscriptions.push(appendrowcommand)

	let deleteemptyrowscommand = vscode.commands.registerCommand('nicegaugetables.deleteEmptyRows', () => {
		deleteEmptyRows(vscode.window.activeTextEditor)
	})
	context.subscriptions.push(appendrowcommand)

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
						let nbcols = parseInt(message.nbcols,10)
						let nbrows = parseInt(message.nbcols, 10)
						if (( nbcols > 0) && (nbrows > 0)) {
							createTable(nbcols, nbrows, latestEditor)
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
					case 'appendrow':
						appendRow(latestEditor)
						return
					case 'deleteemptyrows':
						deleteEmptyRows(latestEditor)
						return
				}
			},
			undefined,
			context.subscriptions
		);


	})
	context.subscriptions.push(deleteemptyrowscommand)

	latestEditor = vscode.window.activeTextEditor

	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) latestEditor = editor
	})
}

// this method is called when your extension is deactivated
export function deactivate() { }
